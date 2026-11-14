import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { validateSchedule } from '@/core/schedule';
import { fromMl, toMl } from '@/core/stats';
import { Unit } from '@/core/types';
import { useApp } from '@/store/useApp';
import { Banner, Btn, Card, Chip, Field } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export default function Onboarding() {
  const t = useTheme();
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.updateSettings);
  const start = useApp((st) => st.startReminders);
  const health = useApp((st) => st.health);
  const router = useRouter();

  const [name, setName] = useState('');
  const [wake, setWake] = useState(s.weekday.wakeUp);
  const [sleep, setSleep] = useState(s.weekday.sleep);
  const [unit, setUnit] = useState<Unit>('ml');
  const [target, setTarget] = useState('2000');
  const [interval, setInterval] = useState<15 | 20 | 30 | 45 | 60>(30);
  const [err, setErr] = useState<string | null>(null);

  const finish = async () => {
    const sch = { wakeUp: wake, sleep };
    const e = validateSchedule(sch);
    if (e) return setErr(e);
    const ml = toMl(Number(target), unit);
    if (!(ml >= 500 && ml <= 8000)) return setErr('Pick a daily target between 500 ml and 8 L.');
    setErr(null);
    await update({ name: name.trim(), weekday: sch, weekend: sch, measurementUnit: unit, dailyTarget: ml, reminderInterval: interval });
    await start(); // asks for notification permission
    await update({ onboarded: true });
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 30, fontWeight: '800', color: t.text }}>Welcome to AquaPulse 💧</Text>
        <Text style={{ color: t.sub, marginVertical: 8 }}>Gentle reminders to drink water. No account needed; everything stays on your phone.</Text>
        <Card>
          <Field label="Your name (optional)" value={name} onChangeText={setName} />
          <Field label="Wake-up time (HH:MM)" value={wake} onChangeText={setWake} />
          <Field label="Sleep time (HH:MM)" value={sleep} onChangeText={setSleep} />
          <Text style={{ color: t.sub, fontSize: 12, marginTop: 10, marginBottom: 6 }}>Units</Text>
          <View style={{ flexDirection: 'row' }}>
            {(['ml', 'oz'] as Unit[]).map((u) => (
              <Chip key={u} label={u} active={unit === u} onPress={() => { setTarget(String(fromMl(toMl(Number(target) || 0, unit), u))); setUnit(u); }} />
            ))}
          </View>
          <Field label={`Daily target (${unit})`} value={target} onChangeText={setTarget} keyboardType="numeric" />
          <Text style={{ color: t.sub, fontSize: 12, marginTop: 10, marginBottom: 6 }}>Remind me every</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {([15, 20, 30, 45, 60] as const).map((m) => (
              <Chip key={m} label={`${m} min`} active={interval === m} onPress={() => setInterval(m)} />
            ))}
          </View>
        </Card>
        {err && <Banner text={err} />}
        {health && !health.ok && health.reason === 'permission_denied' && <Banner text={health.message} />}
        <Btn label="Start reminders" onPress={finish} />
      </ScrollView>
    </SafeAreaView>
  );
}
