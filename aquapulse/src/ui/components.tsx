import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from './theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>{children}</View>;
}

export function Btn({ label, onPress, kind = 'primary', style, disabled }: {
  label: string; onPress: () => void; kind?: 'primary' | 'soft' | 'danger'; style?: ViewStyle; disabled?: boolean;
}) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.primary : kind === 'danger' ? t.dangerSoft : t.primarySoft;
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? t.danger : t.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, style]}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? t.primary : t.primarySoft }]}
    >
      <Text style={{ color: active ? '#fff' : t.primary, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, keyboardType, placeholder }: {
  label: string; value: string; onChangeText: (v: string) => void; keyboardType?: 'numeric' | 'default'; placeholder?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ marginVertical: 6 }}>
      <Text style={{ color: t.sub, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={t.sub}
        style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.bg }]}
      />
    </View>
  );
}

export function Ring({ pct, size = 190, label, sub }: { pct: number; size?: number; label: string; sub: string }) {
  const t = useTheme();
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${Math.round(clamped * 100)} percent of daily goal. ${label}`}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.primarySoft} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.primary} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c}`} strokeDashoffset={c * (1 - clamped)} />
      </Svg>
      <Text style={{ color: t.text, fontSize: 34, fontWeight: '800' }}>{label}</Text>
      <Text style={{ color: t.sub, fontSize: 13 }}>{sub}</Text>
    </View>
  );
}

export function Bars({ values, labels, goal, height = 120 }: { values: number[]; labels: string[]; goal?: number; height?: number }) {
  const t = useTheme();
  const max = Math.max(goal ?? 0, ...values, 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: height + 22, gap: 6 }}>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ height, justifyContent: 'flex-end', width: '100%' }}>
            <View
              accessible
              accessibilityLabel={`${labels[i]}: ${Math.round(v)}`}
              style={{ height: Math.max(3, (v / max) * height), backgroundColor: goal && v >= goal ? t.ok : t.primary, borderRadius: 6, opacity: v === 0 ? 0.25 : 1 }}
            />
          </View>
          <Text style={{ color: t.sub, fontSize: 10, marginTop: 4 }}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

export function Banner({ text, kind = 'danger' }: { text: string; kind?: 'danger' | 'info' }) {
  const t = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: kind === 'danger' ? t.dangerSoft : t.primarySoft }]} accessibilityRole="alert">
      <Text style={{ color: kind === 'danger' ? t.danger : t.primary, fontSize: 13, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 16, borderWidth: 1, marginBottom: 14 },
  btn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  chip: { borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14, marginRight: 8, marginBottom: 8, minHeight: 40, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  banner: { borderRadius: 14, padding: 12, marginBottom: 12 },
});
