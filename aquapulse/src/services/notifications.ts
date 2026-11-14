import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { upcomingReminders } from '@/core/schedule';
import { PAUSE_FOREVER, TONE_MESSAGES, UserSettings } from '@/core/types';

export const CATEGORY_ID = 'water-reminder';
export const ACTION_DRANK = 'drank';
export const ACTION_SNOOZE_10 = 'snooze10';
export const ACTION_SNOOZE_15 = 'snooze15';

const REMINDER_PREFIX = 'rem-';
const SNOOZE_PREFIX = 'snooze-';
/** iOS keeps at most 64 pending local notifications; Android has no such cap, so look further ahead (~7 days at 30 min). */
const ROLLING_WINDOW = Platform.OS === 'android' ? 200 : 48;
/** Don't send a regular reminder this close to a snoozed one. */
const SNOOZE_CLASH_MS = 5 * 60 * 1000;

export type Health =
  | { ok: true; scheduled: number; next: number | null }
  | { ok: false; reason: 'permission_denied' | 'schedule_failed' | 'off' | 'paused'; message: string };

export function configureNotifications(getSettings: () => UserSettings) {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const s = getSettings();
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: s.soundEnabled && !s.quietMode,
        shouldSetBadge: false,
      };
    },
  });
}

export async function setupCategories() {
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: ACTION_DRANK, buttonTitle: 'Drank Water', options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE_10, buttonTitle: 'Snooze 10 Minutes', options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE_15, buttonTitle: 'Snooze 15 Minutes', options: { opensAppToForeground: true } },
  ]);
}

/** Android channel settings are immutable, so each sound/vibration combination gets its own channel. */
export function channelIdFor(s: UserSettings): string {
  const quiet = s.quietMode;
  return `water-${quiet ? 'q' : 'n'}-${!quiet && s.soundEnabled ? 's' : '0'}-${!quiet && s.vibrationEnabled ? 'v' : '0'}`;
}

async function ensureChannel(s: UserSettings): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;
  const id = channelIdFor(s);
  const quiet = s.quietMode;
  await Notifications.setNotificationChannelAsync(id, {
    name: quiet ? 'Water reminders (quiet)' : 'Water reminders',
    importance: quiet ? Notifications.AndroidImportance.LOW : Notifications.AndroidImportance.HIGH,
    sound: !quiet && s.soundEnabled ? 'default' : null,
    vibrationPattern: !quiet && s.vibrationEnabled ? [0, 250, 250, 250] : [0],
    enableVibrate: !quiet && s.vibrationEnabled,
    lightColor: '#4A9FE0',
  });
  // remove stale channels from earlier setting combinations
  const channels = await Notifications.getNotificationChannelsAsync();
  for (const c of channels) {
    if (c.id.startsWith('water-') && c.id !== id) await Notifications.deleteNotificationChannelAsync(c.id);
  }
  return id;
}

export async function permissionGranted(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function requestPermission(): Promise<boolean> {
  if (await permissionGranted()) return true;
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } });
  return p.granted;
}

function content(s: UserSettings, extra?: Record<string, unknown>): Notifications.NotificationContentInput {
  return {
    title: 'AquaPulse 💧',
    body: TONE_MESSAGES[s.tone],
    categoryIdentifier: CATEGORY_ID,
    sound: !s.quietMode && s.soundEnabled ? 'default' : false,
    data: { kind: 'reminder', ...extra },
  };
}

/**
 * Rebuild the rolling window of regular reminders from current settings.
 * Cancels ONLY regular reminders, then schedules afresh with deterministic identifiers
 * (rem-<epoch>), so repeated calls can never produce duplicates. Snoozes are kept.
 * Call on: app launch, foreground, any settings change, pause/resume/stop, each logged drink.
 */
export async function reconcile(s: UserSettings, now = new Date()): Promise<Health> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all.filter((n) => n.identifier.startsWith(REMINDER_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );

    if (!s.notificationsEnabled) return { ok: false, reason: 'off', message: 'Reminders are stopped.' };
    if (!(await permissionGranted())) {
      return {
        ok: false,
        reason: 'permission_denied',
        message: 'Notifications are blocked. Enable them for AquaPulse in system settings, or no reminders will arrive.',
      };
    }
    if (s.pausedUntil !== null && s.pausedUntil >= PAUSE_FOREVER) {
      return { ok: false, reason: 'paused', message: 'Reminders are paused.' };
    }

    const channelId = await ensureChannel(s);
    const snoozes = all
      .filter((n) => n.identifier.startsWith(SNOOZE_PREFIX))
      .map((n) => (n.trigger as { value?: number })?.value)
      .filter((v): v is number => typeof v === 'number');

    const times = upcomingReminders(now, s, ROLLING_WINDOW).filter(
      (t) => !snoozes.some((sn) => Math.abs(sn - t.getTime()) < SNOOZE_CLASH_MS),
    );

    for (const t of times) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${t.getTime()}`,
        content: content(s),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: t, channelId },
      });
    }

    // verify the OS really holds them; never claim "active" otherwise
    const check = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.identifier.startsWith(REMINDER_PREFIX));
    if (times.length > 0 && check.length === 0) {
      return { ok: false, reason: 'schedule_failed', message: 'Could not schedule reminders. Open settings and toggle reminders off and on.' };
    }
    return { ok: true, scheduled: check.length, next: times[0]?.getTime() ?? null };
  } catch (e) {
    return { ok: false, reason: 'schedule_failed', message: `Could not schedule reminders (${(e as Error).message}).` };
  }
}

/** One-time snoozed reminder. Regular reminders within 5 min of it are skipped by reconcile. */
export async function snooze(minutes: number, s: UserSettings, now = new Date()) {
  const when = new Date(now.getTime() + minutes * 60_000);
  const channelId = await ensureChannel(s);
  await Notifications.scheduleNotificationAsync({
    identifier: `${SNOOZE_PREFIX}${when.getTime()}`,
    content: content(s, { snoozed: true }),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId },
  });
}

export async function cancelSnoozes() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.identifier.startsWith(SNOOZE_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/** Clear stale delivered reminders so users aren't greeted by a pile of old ones. */
export async function clearDelivered() {
  await Notifications.dismissAllNotificationsAsync();
}
