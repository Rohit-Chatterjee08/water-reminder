import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dayKey, formatAmount, fromMl } from '@/core/stats';
import { HydrationLog } from '@/core/types';
import { useApp } from '@/store/useApp';
import { Btn, Card, Field } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export default function History() {
  const t = useTheme();
  const logs = useApp((s) => s.logs);
  const u = useApp((s) => s.settings.measurementUnit);
  const { editLog, deleteLog } = useApp.getState();
  const [editing, setEditing] = useState<string | null>(null);
  const [val, setVal] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const groups: Record<string, HydrationLog[]> = {};
  [...logs].sort((a, b) => b.timestamp - a.timestamp).forEach((l) => (groups[dayKey(l.timestamp)] ??= []).push(l));
  const days = Object.keys(groups);

  const save = (l: HydrationLog) => {
    const e = editLog(l.id, Number(val), l.note);
    if (e) return setErr(e);
    setEditing(null); setErr(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <FlatList
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        data={days}
        keyExtractor={(d) => d}
        ListHeaderComponent={<Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginBottom: 14 }}>History</Text>}
        ListEmptyComponent={<Text style={{ color: t.sub }}>No entries yet. Tap + ADD WATER after your next glass.</Text>}
        renderItem={({ item: day }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: t.text, fontWeight: '700' }}>{day}</Text>
              <Text style={{ color: t.primary, fontWeight: '700' }}>{formatAmount(groups[day].reduce((n, l) => n + l.amount, 0), u)}</Text>
            </View>
            {groups[day].map((l) => (
              <View key={l.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border }}>
                {editing === l.id ? (
                  <View>
                    <Field label={`Amount (${u})`} value={val} onChangeText={setVal} keyboardType="numeric" />
                    {err && <Text style={{ color: t.danger }}>{err}</Text>}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Btn label="Save" onPress={() => save(l)} />
                      <Btn label="Cancel" kind="soft" onPress={() => { setEditing(null); setErr(null); }} />
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.text }}>
                        {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {formatAmount(l.amount, u)}
                      </Text>
                      <Text style={{ color: t.sub, fontSize: 12 }}>{l.source === 'notification' ? 'From reminder' : 'Manual'}{l.note ? ` · ${l.note}` : ''}</Text>
                    </View>
                    <Btn label="Edit" kind="soft" onPress={() => { setEditing(l.id); setVal(String(fromMl(l.amount, u))); }} />
                    <View style={{ width: 6 }} />
                    <Btn label="Delete" kind="danger" onPress={() => deleteLog(l.id)} />
                  </View>
                )}
              </View>
            ))}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
