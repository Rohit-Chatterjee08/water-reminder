import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dayKey, toMl, validateAmount } from '@/core/stats';
import { DEFAULT_SETTINGS, HydrationLog, PAUSE_FOREVER, Source, Unit, UserSettings } from '@/core/types';
import { Health, cancelSnoozes, reconcile, requestPermission, snooze } from '@/services/notifications';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface State {
  settings: UserSettings;
  logs: HydrationLog[];
  handledNotifications: string[]; // notification ids already acted on (dedupe)
  lastUndo: HydrationLog | null;
  health: Health | null;
  hydrated: boolean;
  storageError: string | null;

  addWater: (amount: number, unit: Unit, source?: Source, note?: string, id?: string) => string | null; // returns error
  editLog: (id: string, amount: number, note?: string) => string | null;
  deleteLog: (id: string) => void;
  undo: () => void;

  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  startReminders: () => Promise<void>;
  stopReminders: () => Promise<void>;
  pauseFor: (minutes: number | null) => Promise<void>; // null = until resumed
  resume: () => Promise<void>;
  refresh: () => Promise<void>; // re-plan rolling window; call on launch/foreground

  handleAction: (notificationId: string, action: 'drank' | 'snooze10' | 'snooze15') => Promise<void>;
  resetAll: () => Promise<void>;
}

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      logs: [],
      handledNotifications: [],
      lastUndo: null,
      health: null,
      hydrated: false,
      storageError: null,

      addWater: (amount, unit, source = 'manual', note, id) => {
        const ml = toMl(amount, unit);
        const err = validateAmount(ml);
        if (err) return err;
        const entry: HydrationLog = { id: id ?? uid(), timestamp: Date.now(), amount: ml, unit, source, note };
        if (get().logs.some((l) => l.id === entry.id)) return null; // duplicate tap
        set((st) => ({ logs: [entry, ...st.logs], lastUndo: entry }));
        return null;
      },

      editLog: (id, amount, note) => {
        const l = get().logs.find((x) => x.id === id);
        if (!l) return 'Entry not found.';
        const ml = toMl(amount, l.unit);
        const err = validateAmount(ml);
        if (err) return err;
        set((st) => ({ logs: st.logs.map((x) => (x.id === id ? { ...x, amount: ml, note } : x)) }));
        return null;
      },

      deleteLog: (id) => set((st) => ({ logs: st.logs.filter((l) => l.id !== id) })),

      undo: () => {
        const u = get().lastUndo;
        if (!u) return;
        set((st) => ({ logs: st.logs.filter((l) => l.id !== u.id), lastUndo: null }));
      },

      updateSettings: async (patch) => {
        set((st) => ({ settings: { ...st.settings, ...patch } }));
        set({ health: await reconcile(get().settings) });
      },

      startReminders: async () => {
        const granted = await requestPermission();
        set((st) => ({ settings: { ...st.settings, notificationsEnabled: true, pausedUntil: null } }));
        const h = await reconcile(get().settings);
        set({ health: granted ? h : { ok: false, reason: 'permission_denied', message: 'Notifications are blocked. Enable them for AquaPulse in system settings.' } });
      },

      stopReminders: async () => {
        await cancelSnoozes();
        set((st) => ({ settings: { ...st.settings, notificationsEnabled: false, pausedUntil: null } }));
        set({ health: await reconcile(get().settings) });
      },

      pauseFor: async (minutes) => {
        const until = minutes === null ? PAUSE_FOREVER : Date.now() + minutes * 60_000;
        set((st) => ({ settings: { ...st.settings, pausedUntil: until } }));
        set({ health: await reconcile(get().settings) });
      },

      resume: async () => {
        set((st) => ({ settings: { ...st.settings, pausedUntil: null } }));
        set({ health: await reconcile(get().settings) });
      },

      refresh: async () => {
        const s = get().settings;
        // a finished timed pause just clears itself
        if (s.pausedUntil !== null && s.pausedUntil < Date.now()) set({ settings: { ...s, pausedUntil: null } });
        set({ health: await reconcile(get().settings) });
      },

      handleAction: async (notificationId, action) => {
        const handled = get().handledNotifications;
        const key = `${notificationId}:${action}`;
        if (handled.includes(key) || handled.some((h) => h.startsWith(`${notificationId}:`))) return; // one action per notification
        set({ handledNotifications: [key, ...handled].slice(0, 200) });
        const s = get().settings;
        if (action === 'drank') {
          get().addWater(s.glassSize, 'ml', 'notification', undefined, `n-${notificationId}`);
        } else {
          await snooze(action === 'snooze10' ? 10 : 15, s);
        }
        set({ health: await reconcile(get().settings) });
      },

      resetAll: async () => {
        await cancelSnoozes();
        set({ settings: DEFAULT_SETTINGS, logs: [], handledNotifications: [], lastUndo: null });
        set({ health: await reconcile(DEFAULT_SETTINGS) });
      },
    }),
    {
      name: 'aquapulse-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (st) => ({ settings: st.settings, logs: st.logs, handledNotifications: st.handledNotifications }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        // missing/old config falls back to defaults field-by-field
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
      onRehydrateStorage: () => (state, error) => {
        useApp.setState({ hydrated: true, storageError: error ? 'Saved data could not be read. Starting fresh; your reminders still work.' : null });
      },
    },
  ),
);

export const todayLogs = (logs: HydrationLog[], d = new Date()) => logs.filter((l) => dayKey(l.timestamp) === dayKey(d));
