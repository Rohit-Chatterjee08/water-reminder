import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { create } from 'zustand';
import { fromMl } from '@/core/stats';
import { Unit } from '@/core/types';
import { useApp } from '@/store/useApp';
import { Btn, Chip, Field } from './components';
import { useTheme } from './theme';

export const useAddSheet = create<{ open: boolean; show: () => void; hide: () => void }>((set) => ({
  open: false, show: () => set({ open: true }), hide: () => set({ open: false }),
}));

const QUICK_ML = [100, 150, 200, 250, 500];

export function AddSheet() {
  const t = useTheme();
  const { open, hide } = useAddSheet();
  const unit = useApp((s) => s.settings.measurementUnit);
  const addWater = useApp((s) => s.addWater);
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const add = (amount: number, u: Unit) => {
    const e = addWater(amount, u, 'manual', note.trim() || undefined);
    if (e) return setErr(e);
    setCustom(''); setNote(''); setErr(null); hide();
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={hide}>
      <Pressable style={{ flex: 1, backgroundColor: '#0006' }} onPress={hide} accessibilityLabel="Close" />
      <View style={{ backgroundColor: t.card, padding: 20, paddingBottom: 34, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>Add water</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {QUICK_ML.map((ml) => (
            <Chip key={ml} label={`${fromMl(ml, unit)} ${unit}`} active={false} onPress={() => add(fromMl(ml, unit), unit)} />
          ))}
        </View>
        <Field label={`Custom amount (${unit})`} value={custom} onChangeText={setCustom} keyboardType="numeric" placeholder="e.g. 330" />
        <Field label="Note (optional)" value={note} onChangeText={setNote} />
        {err && <Text style={{ color: t.danger, marginBottom: 8 }}>{err}</Text>}
        <Btn label="Add custom amount" onPress={() => add(Number(custom), unit)} />
      </View>
    </Modal>
  );
}
