import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { upcomingReminders } from '@/core/schedule';
import { dayKey, formatAmount, fromMl, lastNDays, totalsByDay } from '@/core/stats';
import { PAUSE_FOREVER } from '@/core/types';
import { useApp } from '@/store/useApp';
import { Banner, Bars, Btn, Card, Ring } from '@/ui/components';
import { useTheme } from '@/ui/theme';

const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Home() {
  const t = useTheme();
  const { settings: s, logs, health, lastUndo, storageError } = useApp();
  const { startReminders, stopReminders, pauseFor, resume, undo } = useApp.getState();
  const u = s.measurementUnit;

  const totals = totalsByDay(logs);
  const today = totals[dayKey(new Date())] ?? 0;
  const remaining = Math.max(0, s.dailyTarget - today);
  const pct = today / s.dailyTarget;
  const glasses = Math.floor(today / s.glassSize);
  const next = s.notificationsEnabled ? upcomingReminders(new Date(), s, 1)[0] : undefined;

  const paused = s.pausedUntil !== null && s.pausedUntil > Date.now();
  const status = !s.notificationsEnabled ? 'Stopped'
    : health && !health.ok && health.reason !== 'paused' ? 'Not working'
    : paused ? (s.pausedUntil! >= PAUSE_FOREVER ? 'Paused' : `Paused until ${fmtTime(s.pausedUntil!)}`)
    : 'Active';

  const week = lastNDays(7);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
        <Text style={{ color: t.sub }}>{s.name ? `Hi ${s.name}` : 'Hello'}</Text>
        <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginBottom: 14 }}>Stay hydrated</Text>

        {storageError && <Banner text={storageError} kind="info" />}
        {health && !health.ok && health.reason !== 'off' && health.reason !== 'paused' && (
          <View>
            <Banner text={health.message} />
            {health.reason === 'permission_denied' && <Btn label="Open system settings" kind="soft" onPress={() => Linking.openSettings()} style={{ marginBottom: 12 }} />}
          </View>
        )}

        <Card style={{ alignItems: 'center' }}>
          <Ring pct={pct} label={`${Math.round(pct * 1000) / 10}%`} sub={`${formatAmount(today, u)} of ${formatAmount(s.dailyTarget, u)}`} />
          <View style={{ flexDirection: 'row', marginTop: 16, width: '100%', justifyContent: 'space-around' }}>
            <Stat label="Consumed" value={formatAmount(today, u)} />
            <Stat label="Remaining" value={formatAmount(remaining, u)} />
            <Stat label="Glasses" value={String(glasses)} />
          </View>
        </Card>

        <Card>
          <Text style={{ color: t.sub, fontSize: 12 }}>Reminders</Text>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>{status}</Text>
          <Text style={{ color: t.sub, marginBottom: 12 }}>
            {next ? `Next at ${fmtTime(next.getTime())} · every ${s.reminderInterval} min` : s.notificationsEnabled ? 'No reminder scheduled right now' : 'Start reminders to get nudges'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {!s.notificationsEnabled && <Btn label="Start" onPress={startReminders} />}
            {s.notificationsEnabled && paused && <Btn label="Resume" onPress={resume} />}
            {s.notificationsEnabled && !paused && <Btn label="Pause" kind="soft" onPress={() => pauseFor(null)} />}
            {s.notificationsEnabled && !paused && <Btn label="30 min" kind="soft" onPress={() => pauseFor(30)} />}
            {s.notificationsEnabled && !paused && <Btn label="1 hr" kind="soft" onPress={() => pauseFor(60)} />}
            {s.notificationsEnabled && !paused && <Btn label="2 hr" kind="soft" onPress={() => pauseFor(120)} />}
            {s.notificationsEnabled && <Btn label="Stop" kind="danger" onPress={stopReminders} />}
          </View>
          {s.notificationsEnabled && !paused && <Text style={{ color: t.sub, fontSize: 11, marginTop: 8 }}>30 min / 1 hr / 2 hr = meeting mode</Text>}
        </Card>

        {lastUndo && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: t.text }}>Added {formatAmount(lastUndo.amount, u)}</Text>
            <Btn label="Undo" kind="soft" onPress={undo} />
          </Card>
        )}

        <Card>
          <Text style={{ color: t.text, fontWeight: '700', marginBottom: 8 }}>This week</Text>
          <Bars values={week.map((d) => fromMl(totals[dayKey(d)] ?? 0, u))} labels={week.map((d) => 'SMTWTFS'[d.getDay()])} goal={fromMl(s.dailyTarget, u)} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: t.text, fontSize: 17, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: t.sub, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
