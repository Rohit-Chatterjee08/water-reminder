import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { averageDaily, dayKey, formatAmount, fromMl, goalCompletion, insight, lastNDays, streaks, topHours, totalsByDay } from '@/core/stats';
import { useApp } from '@/store/useApp';
import { Bars, Card } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export default function Stats() {
  const t = useTheme();
  const logs = useApp((s) => s.logs);
  const s = useApp((st) => st.settings);
  const u = s.measurementUnit;
  const totals = totalsByDay(logs);
  const week = lastNDays(7);
  const month = lastNDays(30);
  const { current, best } = streaks(logs, s.dailyTarget);
  const hours = topHours(logs);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
        <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginBottom: 14 }}>Statistics</Text>
        <Card>
          <Text style={{ color: t.text }}>💡 {insight(logs, s.dailyTarget)}</Text>
        </Card>
        <Card>
          <Text style={{ color: t.text, fontWeight: '700', marginBottom: 8 }}>Last 7 days</Text>
          <Bars values={week.map((d) => fromMl(totals[dayKey(d)] ?? 0, u))} labels={week.map((d) => 'SMTWTFS'[d.getDay()])} goal={fromMl(s.dailyTarget, u)} />
          <Text style={{ color: t.sub, marginTop: 8 }}>Week total: {formatAmount(week.reduce((n, d) => n + (totals[dayKey(d)] ?? 0), 0), u)}</Text>
        </Card>
        <Card>
          <Text style={{ color: t.text, fontWeight: '700', marginBottom: 8 }}>Last 30 days</Text>
          <Bars height={90} values={month.map((d) => fromMl(totals[dayKey(d)] ?? 0, u))} labels={month.map((d, i) => (i % 5 === 0 ? String(d.getDate()) : ''))} goal={fromMl(s.dailyTarget, u)} />
          <Text style={{ color: t.sub, marginTop: 8 }}>Month total: {formatAmount(month.reduce((n, d) => n + (totals[dayKey(d)] ?? 0), 0), u)}</Text>
        </Card>
        <Card>
          <Row label="Average per day (7 days)" value={formatAmount(averageDaily(logs, 7), u)} />
          <Row label="Goal reached (30 days)" value={`${goalCompletion(logs, s.dailyTarget, 30)}% of days`} />
          <Row label="Current streak" value={`${current} day${current === 1 ? '' : 's'}`} />
          <Row label="Best streak" value={`${best} day${best === 1 ? '' : 's'}`} />
          <Row label="Usual drinking hours" value={hours.length ? hours.map((h) => `${String(h).padStart(2, '0')}:00`).join(', ') : '—'} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ color: t.sub }}>{label}</Text>
      <Text style={{ color: t.text, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}
