export type Unit = 'ml' | 'oz';
export type Source = 'manual' | 'notification';
export type Tone = 'normal' | 'friendly' | 'motivational' | 'gentle';

export interface DaySchedule {
  wakeUp: string; // "HH:mm"
  sleep: string; // "HH:mm"
}

export interface UserSettings {
  userId: string;
  name: string;
  onboarded: boolean;
  weekday: DaySchedule;
  weekend: DaySchedule;
  useWeekendSchedule: boolean;
  reminderInterval: 15 | 20 | 30 | 45 | 60;
  dailyTarget: number; // always stored in ml
  glassSize: number; // ml per glass, also used for the "Drank Water" notification action
  measurementUnit: Unit;
  notificationsEnabled: boolean; // user intent: reminders running
  pausedUntil: number | null; // epoch ms; null = not paused
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietMode: boolean; // silent notifications
  tone: Tone;
  theme: 'light' | 'dark' | 'system';
}

export interface HydrationLog {
  id: string;
  timestamp: number; // epoch ms
  amount: number; // always ml internally
  unit: Unit; // unit the user entered it in
  source: Source;
  note?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  userId: 'local',
  name: '',
  onboarded: false,
  weekday: { wakeUp: '08:00', sleep: '22:00' },
  weekend: { wakeUp: '09:00', sleep: '23:00' },
  useWeekendSchedule: false,
  reminderInterval: 30,
  dailyTarget: 2000,
  glassSize: 250,
  measurementUnit: 'ml',
  notificationsEnabled: false,
  pausedUntil: null,
  soundEnabled: true,
  vibrationEnabled: true,
  quietMode: false,
  tone: 'normal',
  theme: 'system',
};

export const TONE_MESSAGES: Record<Tone, string> = {
  normal: 'Time for a little water break! Stay refreshed.',
  friendly: 'Your body deserves a refreshing break. Drink some water!',
  motivational: 'Small habits create healthy routines. Take a sip!',
  gentle: 'Just a friendly reminder to hydrate.',
};

export const ML_PER_OZ = 29.5735;
export const MAX_SINGLE_ENTRY_ML = 5000;

/** Sentinel for an open-ended pause (until the user resumes). */
export const PAUSE_FOREVER = 8.64e15;
