import { HydrationLog, ML_PER_OZ, MAX_SINGLE_ENTRY_ML, Unit } from './types';

export function dayKey(ts: number | Date): string {
  const d = typeof ts === 'number' ? new Date(ts) : ts;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function toMl(value: number, unit: Unit): number {
  return unit === 'oz' ? Math.round(value * ML_PER_OZ) : Math.round(value);
}

export function fromMl(ml: number, unit: Unit): number {
  return unit === 'oz' ? Math.round((ml / ML_PER_OZ) * 10) / 10 : Math.round(ml);
}

export function formatAmount(ml: number, unit: Unit): string {
  return `${fromMl(ml, unit).toLocaleString()} ${unit}`;
}

/** Returns an error message, or null if the amount (in ml) is acceptable. */
export function validateAmount(ml: number): string | null {
  if (!Number.isFinite(ml) || ml <= 0) return 'Enter an amount greater than zero.';
  if (ml > MAX_SINGLE_ENTRY_ML) return 'That looks too large for one entry.';
  return null;
}

export function totalsByDay(logs: HydrationLog[]): Record<string, number> {
  const t: Record<string, number> = {};
  for (const l of logs) t[dayKey(l.timestamp)] = (t[dayKey(l.timestamp)] ?? 0) + l.amount;
  return t;
}

export function totalForDay(logs: HydrationLog[], day: Date): number {
  const k = dayKey(day);
  return logs.reduce((n, l) => (dayKey(l.timestamp) === k ? n + l.amount : n), 0);
}

export function lastNDays(n: number, today = new Date()): Date[] {
  return Array.from({ length: n }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i)));
}

/** Current and best streak of days that met the goal. Today not yet met doesn't break the current streak. */
export function streaks(logs: HydrationLog[], target: number, today = new Date()) {
  const totals = totalsByDay(logs);
  const met = (d: Date) => (totals[dayKey(d)] ?? 0) >= target;
  let current = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!met(cursor)) cursor.setDate(cursor.getDate() - 1);
  while (met(cursor)) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const keys = Object.keys(totals).filter((k) => totals[k] >= target).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const [y, m, d] = k.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (prev && Math.round((dt.getTime() - prev.getTime()) / 86400000) === 1) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = dt;
  }
  return { current, best: Math.max(best, current) };
}

export function averageDaily(logs: HydrationLog[], days: number, today = new Date()): number {
  const totals = totalsByDay(logs);
  const sum = lastNDays(days, today).reduce((n, d) => n + (totals[dayKey(d)] ?? 0), 0);
  return Math.round(sum / days);
}

export function goalCompletion(logs: HydrationLog[], target: number, days: number, today = new Date()): number {
  const totals = totalsByDay(logs);
  const hit = lastNDays(days, today).filter((d) => (totals[dayKey(d)] ?? 0) >= target).length;
  return Math.round((hit / days) * 100);
}

/** Hours of day (0-23) with the most logged drinks, top 3. */
export function topHours(logs: HydrationLog[]): number[] {
  const c = new Array(24).fill(0);
  for (const l of logs) c[new Date(l.timestamp).getHours()]++;
  return c
    .map((count, h) => ({ h, count }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((x) => x.h);
}

/** Gentle, never-shaming observation. */
export function insight(logs: HydrationLog[], target: number, today = new Date()): string {
  if (logs.length === 0) return 'Log your first glass to start seeing insights.';
  const avg = averageDaily(logs, 7, today);
  const { current } = streaks(logs, target, today);
  const hours = topHours(logs);
  if (current >= 3) return `${current} days in a row at your goal. Nice rhythm!`;
  if (hours.length) return `You drink most around ${String(hours[0]).padStart(2, '0')}:00. Reminders near then fit you well.`;
  return `Your 7-day average is ${avg} ml. Every sip counts.`;
}
