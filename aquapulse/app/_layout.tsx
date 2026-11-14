import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerTopUp } from '@/services/backgroundTopUp';
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
  const onboarded = useApp((s) => s.settings.onboarded);
  const theme = useApp((s) => s.settings.theme);
  const router = useRouter();
  const segments = useSegments();

  // one-time setup once persisted state is loaded
  useEffect(() => {
    if (!hydrated) return;
    setupCategories().then(async () => {
      await useApp.getState().refresh();
      registerTopUp();
      // action tapped while the app was killed
      handleResponse(await Notifications.getLastNotificationResponseAsync());
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

  useEffect(() => {
    if (!hydrated) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboarded && !inOnboarding) router.replace('/onboarding');
    if (onboarded && inOnboarding) router.replace('/');
  }, [hydrated, onboarded, segments]);

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
