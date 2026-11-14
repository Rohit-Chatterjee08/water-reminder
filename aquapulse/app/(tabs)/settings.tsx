import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { validateSchedule } from '@/core/schedule';
import { fromMl, toMl } from '@/core/stats';
import { DaySchedule, Tone, Unit } from '@/core/types';
import { useApp } from '@/store/useApp';
import { Banner, Btn, Card, Chip, Field } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export default function Settings() {
  const t = useTheme();
  const s = useApp((st) => st.settings);
  const logs = useApp((st) => st.logs);
  const health = useApp((st) => st.health);
  const { updateSettings: update, startReminders, stopReminders, resetAll } = useApp.getState();
  const u = s.measurementUnit;

  const [target, setTarget] = useState(String(fromMl(s.dailyTarget, u)));
  const [glass, setGlass] = useState(String(fromMl(s.glassSize, u)));
  const [err, setErr] = useState<string | null>(null);

  const saveNumbers = async () => {
    const tm = toMl(Number(target), u);
    const gm = toMl(Number(glass), u);
    if (!(tm >= 500 && tm <= 8000)) return setErr('Daily target must be between 500 ml and 8 L.');
    if (!(gm >= 50 && gm <= 1500)) return setErr('Glass size must be between 50 ml and 1.5 L.');
    setErr(null);
    await update({ dailyTarget: tm, glassSize: gm });
  };

  const exportData = async () => {
    try {
      const path = `${FileSystem.cacheDirectory}aquapulse-export.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify({ exportedAt: new Date().toISOString(), settings: s, logs }, null, 2));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'application/json' });
      else Alert.alert('Export saved', path);
    } catch (e) {
      Alert.alert('Export failed', `Storage is unavailable (${(e as Error).message}).`);
    }
  };

  const confirmReset = () =>
    Alert.alert('Reset everything?', 'This deletes all entries and settings and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetAll },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginBottom: 14 }}>Settings</Text>

        <Card>
          <ToggleRow label="Reminders" value={s.notificationsEnabled} onChange={(v) => (v ? startReminders() : stopReminders())} />
          {health && !health.ok && health.reason === 'permission_denied' && (
            <>
              <Banner text={health.message} />
              <Btn label="Open system settings" kind="soft" onPress={() => Linking.openSettings()} />
            </>
          )}
          <Label>Interval</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {([15, 20, 30, 45, 60] as const).map((m) => (
              <Chip key={m} label={`${m} min`} active={s.reminderInterval === m} onPress={() => update({ reminderInterval: m })} />
            ))}
          </View>
          <Label>Message style</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(['normal', 'friendly', 'motivational', 'gentle'] as Tone[]).map((x) => (
              <Chip key={x} label={x} active={s.tone === x} onPress={() => update({ tone: x })} />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ color: t.text, fontWeight: '700' }}>Schedule</Text>
          <ScheduleEditor title="Weekdays" value={s.weekday} onSave={(v) => update({ weekday: v })} />
          <ToggleRow label="Different weekend schedule" value={s.useWeekendSchedule} onChange={(v) => update({ useWeekendSchedule: v })} />
          {s.useWeekendSchedule && <ScheduleEditor title="Weekends" value={s.weekend} onSave={(v) => update({ weekend: v })} />}
        </Card>

        <Card>
          <Label>Units</Label>
          <View style={{ flexDirection: 'row' }}>
            {(['ml', 'oz'] as Unit[]).map((x) => (
              <Chip key={x} label={x} active={u === x} onPress={() => {
                update({ measurementUnit: x });
                setTarget(String(fromMl(s.dailyTarget, x))); setGlass(String(fromMl(s.glassSize, x)));
              }} />
            ))}
          </View>
          <Field label={`Daily target (${u})`} value={target} onChangeText={setTarget} keyboardType="numeric" />
          <Field label={`Glass size (${u}), used by "Drank Water"`} value={glass} onChangeText={setGlass} keyboardType="numeric" />
          {err && <Text style={{ color: t.danger, marginBottom: 6 }}>{err}</Text>}
          <Btn label="Save" onPress={saveNumbers} />
        </Card>

        <Card>
          <ToggleRow label="Sound" value={s.soundEnabled} onChange={(v) => update({ soundEnabled: v })} />
          <ToggleRow label="Vibration (Android)" value={s.vibrationEnabled} onChange={(v) => update({ vibrationEnabled: v })} />
          <ToggleRow label="Quiet mode (silent notifications)" value={s.quietMode} onChange={(v) => update({ quietMode: v })} />
          <Label>Theme</Label>
          <View style={{ flexDirection: 'row' }}>
            {(['system', 'light', 'dark'] as const).map((x) => (
              <Chip key={x} label={x} active={s.theme === x} onPress={() => update({ theme: x })} />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ color: t.sub, marginBottom: 10 }}>Your data stays on this device. Nothing is uploaded.</Text>
          <Btn label="Export data (JSON)" kind="soft" onPress={exportData} />
          <View style={{ height: 8 }} />
          <Btn label="Reset app data" kind="danger" onPress={confirmReset} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={{ color: t.sub, fontSize: 12, marginTop: 10, marginBottom: 6 }}>{children}</Text>;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>{label}</Text>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: t.primary }} />
    </View>
  );
}

function ScheduleEditor({ title, value, onSave }: { title: string; value: DaySchedule; onSave: (v: DaySchedule) => void }) {
  const t = useTheme();
  const [wake, setWake] = useState(value.wakeUp);
  const [sleep, setSleep] = useState(value.sleep);
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    const v = { wakeUp: wake, sleep };
    const e = validateSchedule(v);
    if (e) return setErr(e);
    setErr(null); onSave(v);
  };
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ color: t.sub, fontSize: 12 }}>{title}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Wake-up (HH:MM)" value={wake} onChangeText={setWake} /></View>
        <View style={{ flex: 1 }}><Field label="Sleep (HH:MM)" value={sleep} onChangeText={setSleep} /></View>
      </View>
      {err && <Text style={{ color: t.danger, marginBottom: 6 }}>{err}</Text>}
      <Btn label={`Save ${title.toLowerCase()}`} kind="soft" onPress={save} />
    </View>
  );
}
