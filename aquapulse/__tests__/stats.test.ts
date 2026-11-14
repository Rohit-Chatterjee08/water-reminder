import { averageDaily, fromMl, goalCompletion, insight, streaks, toMl, topHours, totalForDay, validateAmount } from '../src/core/stats';
import { HydrationLog } from '../src/core/types';

const today = new Date(2026, 5, 10, 15, 0);
const log = (daysAgo: number, amount: number, hour = 10): HydrationLog => ({
  id: `${daysAgo}-${amount}-${hour}-${Math.random()}`,
  timestamp: new Date(2026, 5, 10 - daysAgo, hour).getTime(),
  amount, unit: 'ml', source: 'manual',
});

describe('amounts', () => {
  it('validates amounts', () => {
    expect(validateAmount(250)).toBeNull();
    expect(validateAmount(0)).not.toBeNull();
    expect(validateAmount(-5)).not.toBeNull();
    expect(validateAmount(NaN)).not.toBeNull();
    expect(validateAmount(99999)).not.toBeNull();
  });
  it('converts units', () => {
    expect(toMl(8, 'oz')).toBe(237);
    expect(fromMl(237, 'oz')).toBe(8);
    expect(toMl(250, 'ml')).toBe(250);
  });
});

describe('daily totals', () => {
  it('sums only the given day', () => {
    const logs = [log(0, 250), log(0, 500), log(1, 300)];
    expect(totalForDay(logs, today)).toBe(750);
  });
});

describe('streaks', () => {
  it('counts consecutive goal days, today in progress does not break it', () => {
    const logs = [log(1, 2000), log(2, 2100), log(3, 2000), log(5, 2000), log(0, 300)];
    expect(streaks(logs, 2000, today)).toEqual({ current: 3, best: 3 });
  });
  it('current streak is 0 when yesterday missed and today not met', () => {
    expect(streaks([log(2, 2000)], 2000, today).current).toBe(0);
  });
  it('best streak survives a gap', () => {
    const logs = [log(0, 2000), log(4, 2000), log(5, 2000), log(6, 2000), log(7, 2000)];
    expect(streaks(logs, 2000, today)).toEqual({ current: 1, best: 4 });
  });
});

describe('averages and insights', () => {
  it('averages over a window including empty days', () => {
    expect(averageDaily([log(0, 700)], 7, today)).toBe(100);
  });
  it('goal completion percentage', () => {
    expect(goalCompletion([log(0, 2000), log(1, 2000)], 2000, 4, today)).toBe(50);
  });
  it('finds the most common hours', () => {
    expect(topHours([log(0, 200, 9), log(1, 200, 9), log(2, 200, 14)])[0]).toBe(9);
  });
  it('insight never shames', () => {
    const msg = insight([log(0, 100)], 2000, today).toLowerCase();
    expect(msg).not.toMatch(/fail|miss|bad|lazy|behind/);
  });
});
