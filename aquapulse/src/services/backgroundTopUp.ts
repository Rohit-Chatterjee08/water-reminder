import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { DEFAULT_SETTINGS, UserSettings } from '@/core/types';
import { reconcile } from './notifications';

export const TOP_UP_TASK = 'aquapulse-top-up';

/**
 * Periodic OS-scheduled job (WorkManager on Android, BGTaskScheduler on iOS).
 * It re-plans the rolling reminder window even if the user never opens the app,
 * so reminders don't run out. It runs headless, so it reads settings straight from storage.
 * The OS decides the exact timing (roughly every 15+ minutes at best, often hours).
 */
TaskManager.defineTask(TOP_UP_TASK, async () => {
  try {
    const raw = await AsyncStorage.getItem('aquapulse-v1');
    if (!raw) return BackgroundTask.BackgroundTaskResult.Success;
    const persisted = JSON.parse(raw)?.state?.settings as Partial<UserSettings> | undefined;
    if (!persisted) return BackgroundTask.BackgroundTaskResult.Success;
    const settings: UserSettings = { ...DEFAULT_SETTINGS, ...persisted };
    if (settings.pausedUntil !== null && settings.pausedUntil < Date.now()) settings.pausedUntil = null;
    if (settings.notificationsEnabled) await reconcile(settings);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerTopUp() {
  try {
    if (!(await TaskManager.isTaskRegisteredAsync(TOP_UP_TASK))) {
      await BackgroundTask.registerTaskAsync(TOP_UP_TASK, { minimumInterval: 60 }); // minutes
    }
  } catch {
    // Background tasks can be unavailable (e.g. restricted by the OS). Foreground refresh still works.
  }
}
