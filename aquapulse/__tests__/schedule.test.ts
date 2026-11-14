import { remindersForDay, upcomingReminders, validateSchedule } from '../src/core/schedule';
import { DEFAULT_SETTINGS, UserSettings } from '../src/core/types';

const base: UserSettings = { ...DEFAULT_SETTINGS };
const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('remindersForDay', () => {
  it('30-min interval from 08:00 starts 08:30 and ends at sleep time', () => {
    const r = remindersForDay(new Date(2026, 5, 10), base).map(hm);
    expect(r[0]).toBe('08:30');
    expect(r[1]).toBe('09:00');
    expect(r[r.length - 1]).toBe('22:00');
    expect(r).toHaveLength(28);
  });

  it('never schedules during sleep hours', () => {
    const r = remindersForDay(new Date(2026, 5, 10), base);
    expect(r.every((d) => d.getHours() >= 8 && d.getHours() <= 22)).toBe(true);
  });

  it.each([15, 20, 30, 45, 60] as const)('supports %i-minute interval', (i) => {
    const r = remindersForDay(new Date(2026, 5, 10), { ...base, reminderInterval: i });
    expect(r[1].getTime() - r[0].getTime()).toBe(i * 60_000);
  });

  it('uses the weekend schedule on Saturday when enabled', () => {
    const s = { ...base, useWeekendSchedule: true };
    const sat = new Date(2026, 5, 13); // Saturday
    expect(sat.getDay()).toBe(6);
    expect(hm(remindersForDay(sat, s)[0])).toBe('09:30');
    expect(hm(remindersForDay(new Date(2026, 5, 12), s)[0])).toBe('08:30'); // Friday
  });

  it('returns nothing for invalid (sleep <= wake) schedules', () => {
    expect(remindersForDay(new Date(2026, 5, 10), { ...base, weekday: { wakeUp: '22:00', sleep: '08:00' } })).toEqual([]);
  });
});

describe('upcomingReminders', () => {
  it('only returns future times, in order, no duplicates', () => {
    const now = new Date(2026, 5, 10, 12, 10);
    const r = upcomingReminders(now, base, 10);
    expect(hm(r[0])).toBe('12:30');
    expect(r.every((d) => d.getTime() > now.getTime())).toBe(true);
    expect(new Set(r.map((d) => d.getTime())).size).toBe(r.length);
    expect([...r].sort((a, b) => a.getTime() - b.getTime())).toEqual(r);
  });

  it('rolls into the next day after sleep time', () => {
    const r = upcomingReminders(new Date(2026, 5, 10, 22, 5), base, 2);
    expect(r[0].getDate()).toBe(11);
    expect(hm(r[0])).toBe('08:30');
  });

  it('respects the rolling-window limit', () => {
    expect(upcomingReminders(new Date(2026, 5, 10, 8, 0), base, 48)).toHaveLength(48);
  });

  it('skips reminders before pausedUntil but keeps later ones', () => {
    const now = new Date(2026, 5, 10, 12, 0);
    const pausedUntil = new Date(2026, 5, 10, 13, 10).getTime();
    const r = upcomingReminders(now, { ...base, pausedUntil }, 3);
    expect(hm(r[0])).toBe('13:30');
  });

  it('returns nothing for an open-ended pause', () => {
    expect(upcomingReminders(new Date(), { ...base, pausedUntil: 8.64e15 })).toEqual([]);
  });
});

describe('validateSchedule', () => {
  it('accepts valid and rejects bad input', () => {
    expect(validateSchedule({ wakeUp: '07:00', sleep: '23:00' })).toBeNull();
    expect(validateSchedule({ wakeUp: '7:00', sleep: '23:00' })).not.toBeNull();
    expect(validateSchedule({ wakeUp: '10:00', sleep: '09:00' })).not.toBeNull();
    expect(validateSchedule({ wakeUp: '08:00', sleep: '25:00' })).not.toBeNull();
  });
});
