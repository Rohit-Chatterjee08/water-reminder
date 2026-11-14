import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddSheet, useAddSheet } from '@/ui/addSheet';
import { useTheme } from '@/ui/theme';

const icon = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

export default function TabsLayout() {
  const t = useTheme();
  const show = useAddSheet((s) => s.show);
  const insets = useSafeAreaInsets();
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: t.primary,
          tabBarInactiveTintColor: t.sub,
          tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('💧') }} />
        <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('🗒️') }} />
        <Tabs.Screen name="stats" options={{ title: 'Statistics', tabBarIcon: icon('📊') }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙️') }} />
      </Tabs>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add water"
        onPress={show}
        style={{ position: 'absolute', right: 20, bottom: 70 + insets.bottom, backgroundColor: t.primary, borderRadius: 30, paddingHorizontal: 20, height: 56, justifyContent: 'center', elevation: 6 }}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>+ ADD WATER</Text>
      </Pressable>
      <AddSheet />
    </>
  );
}
