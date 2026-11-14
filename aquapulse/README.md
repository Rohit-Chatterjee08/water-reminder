# AquaPulse 💧

Simple water reminders for Android and iOS (Expo / React Native / TypeScript). No account, works offline, data stays on the device.

## Run it

```bash
npm install
npm test            # 25 unit tests (schedule + stats)
npm run typecheck
npx expo prebuild   # generates android/ and ios/
npx expo run:android   # needs Android Studio + a physical phone (USB debugging)
npx expo run:ios       # needs a Mac, Xcode, and a physical iPhone
```

Notifications must be tested in a development build on a real phone. Expo Go is not enough.

For installable builds use EAS: `npx eas build -p android --profile preview` (APK) and `npx eas build -p ios` (needs an Apple Developer account).

## How reminders work

- `src/core/schedule.ts` is pure logic: wake-up + interval up to sleep time, weekday/weekend schedules, pause handling.
- `src/services/notifications.ts` hands the next 48 reminder times to the OS as dated local notifications (`rem-<timestamp>` IDs). No JS timers are used, so delivery doesn't need the app running.
- `reconcile()` cancels only `rem-*` notifications and re-adds them, so duplicates can't accumulate. It runs on launch, on foreground, and after every settings change, pause/resume/stop, or logged drink.
- Snoozes are separate `snooze-*` one-offs. Regular reminders within 5 minutes of one are skipped.
- On foreground, old delivered reminders are cleared so nothing piles up.
- The Home screen only says "Active" when permission is granted and the OS really holds scheduled notifications. Otherwise it shows what's wrong and a button to open system settings.

## Known limits (please read)

- **The window is rolling, not infinite.** Android schedules up to 200 reminders ahead (about 7 days at 30 min); iOS 48 (about 1.7 days, because of its 64-notification cap). A periodic OS background job (WorkManager / BGTaskScheduler via `expo-background-task`) tops the window up without the app being opened, but the OS decides when it runs and may delay or skip it (battery saver, force-stopped app, iOS low-usage apps). Not tested on a physical device.
- **Timezone/DST changes** are picked up the next time the app is opened. Until then, already scheduled times stay at their old absolute moments.
- **Notification buttons open the app** (Drank Water / Snooze). That is the reliable path in Expo. Silent background handling needs extra native work.
- **Reboot:** Android restores scheduled notifications after reboot via expo-notifications. This has **not** been tested on a physical device here.
- Vibration is controlled by the OS on iOS.
- Not built: cloud backup/restore, vacation mode, Supabase/Firebase sync.

## Device checklist

Install a dev build, finish onboarding and allow notifications, set a 15-min interval, close the app, and confirm banners arrive. Then tap Drank Water, tap Snooze, pause/resume, reboot the phone, change timezone, switch to airplane mode. `maestro/smoke.yaml` covers the in-app flow.

## Structure

```
app/            Expo Router screens (onboarding, tabs: Home, History, Statistics, Settings)
src/core/       pure logic: types, schedule, stats  (unit tested)
src/services/   notifications engine
src/store/      Zustand store persisted in AsyncStorage
src/ui/         theme, components, add-water sheet
__tests__/      Jest tests
maestro/        end-to-end flow
```

Data models: `UserSettings`, `HydrationLog` (id, timestamp, amount, unit, source, note) in `src/core/types.ts`. Reminder schedule state is held by the OS and rebuilt from settings, so there is no separate table to drift out of sync.

## Getting the APK

**Option A, GitHub (no local setup):** push this folder to a GitHub repo, open the Actions tab, run "Build Android APK", and download `aquapulse-apk` from the run. Unzip it, copy `app-release.apk` to your phone and install it (allow "install unknown apps"). It is signed with the default debug key, which is fine for personal use but not for the Play Store.

**Option B, EAS:** `npm i -g eas-cli && eas login && eas build -p android --profile preview` gives a download link for an APK.

**Option C, local:** install Android Studio, then `npx expo prebuild --platform android && cd android && ./gradlew assembleRelease`. The APK is at `android/app/build/outputs/apk/release/`.
