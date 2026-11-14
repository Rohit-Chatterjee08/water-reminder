import { DaySchedule, UserSettings } from './types';

/** Parse "HH:mm" into minutes since midnight. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Schedule that applies to a given date (weekend = Sat/Sun). */
export function scheduleFor(date: Date, s: UserSettings): DaySchedule {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  return s.useWeekendSchedule && isWeekend ? s.weekend : s.weekday;
}

/**
 * All reminder times for one local calendar day.
 * First reminder = wakeUp + interval; last reminder <= sleep.
 * Built with local-time Date arithmetic so DST days stay at the right wall-clock time.
 */
export function remindersForDay(day: Date, s: UserSettings): Date[] {
  const { wakeUp, sleep } = scheduleFor(day, s);
  const start = toMinutes(wakeUp);
  const end = toMinutes(sleep);
  const out: Date[] = [];
  if (end <= start) return out; // invalid / overnight schedules are rejected by validation
  for (let m = start + s.reminderInterval; m <= end; m += s.reminderInterval) {
    out.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60, 0, 0));
  }
  return out;
}

/**
 * Next `limit` reminder times strictly after `from`.
 * Skips anything before `pausedUntil`. This is the rolling window handed to the OS
 * (iOS caps pending local notifications at 64).
 */
export function upcomingReminders(from: Date, s: UserSettings, limit = 48, maxDays = 14): Date[] {
  const out: Date[] = [];
  const earliest = Math.max(from.getTime(), s.pausedUntil ?? 0);
  for (let d = 0; d < maxDays && out.length < limit; d++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + d);
    for (const t of remindersForDay(day, s)) {
      if (t.getTime() > earliest) out.push(t);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function validateSchedule(sch: DaySchedule): string | null {
  const re = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!re.test(sch.wakeUp) || !re.test(sch.sleep)) return 'Use the 24-hour format HH:MM.';
  if (toMinutes(sch.sleep) <= toMinutes(sch.wakeUp)) return 'Sleep time must be later than wake-up time.';
  return null;
}
