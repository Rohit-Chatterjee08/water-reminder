import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, AppState, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { clearDelivered, configureNotifications, setupCategories, ACTION_DRANK, ACTION_SNOOZE_10, ACTION_SNOOZE_15 } from '@/services/notifications';
import { useApp } from '@/store/useApp';
import { useTheme } from '@/ui/theme';

configureNotifications(() => useApp.getState().settings);

function handleResponse(r: Notifications.NotificationResponse | null) {
  if (!r) return;
  const id = r.notification.request.identifier;
  const a = r.actionIdentifier;
  const st = useApp.getState();
  if (a === ACTION_DRANK) st.handleAction(id, 'drank');
  else if (a === ACTION_SNOOZE_10) st.handleAction(id, 'snooze10');
  else if (a === ACTION_SNOOZE_15) st.handleAction(id, 'snooze15');
}

export default function RootLayout() {
  const t = useTheme();
  const hydrated = useApp((s) => s.hydrated);
  const theme = useApp((s) => s.settings.theme);

  // one-time setup once persisted state is loaded
  useEffect(() => {
    if (!hydrated) return;
    setupCategories().then(async () => {
      await useApp.getState().refresh();
      // action tapped while the app was killed
      handleResponse(await Notifications.getLastNotificationResponseAsync());
    }).catch(() => {
      // notification setup failed; the Home screen shows the health banner instead of crashing
    });
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        clearDelivered(); // don't pile up missed reminders
        useApp.getState().refresh(); // re-plan window, picks up timezone/DST changes
      }
    });
    return () => { sub.remove(); appSub.remove(); };
  }, [hydrated]);

  if (!hydrated) {
    return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.bg }}><ActivityIndicator color={t.primary} /></View>;
  }
  return (
    <SafeAreaProvider>
      <StatusBar style={theme === 'dark' ? 'light' : 'auto'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
    </SafeAreaProvider>
  );
}

/** Shows the real error instead of a blank screen if something fails at runtime. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 80 }} style={{ backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#12324A' }}>AquaPulse hit a problem</Text>
      <Text selectable style={{ marginTop: 12, color: '#D9534F' }}>{String(error?.message ?? error)}</Text>
      <Text selectable style={{ marginTop: 12, color: '#6B8499', fontSize: 11 }}>{String(error?.stack ?? '').slice(0, 1500)}</Text>
      <Text onPress={retry} style={{ marginTop: 20, color: '#4A9FE0', fontWeight: '700', fontSize: 16 }}>Try again</Text>
    </ScrollView>
  );
}
