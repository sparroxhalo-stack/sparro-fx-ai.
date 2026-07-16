# Sparro FX AI

A React Native / Expo mobile app that delivers AI-graded (A/B/C) forex trading signals with push notifications, a trade journal, performance analytics, and an MT5 bot feed.

## Stack

- **React Native 0.74 + Expo SDK 51**
- **Supabase** — auth and user profiles (`is_premium` flag)
- **Railway backend** — Python/FastAPI that calls Anthropic Claude for signal grading
- **Expo Notifications** — local + push alerts
- **AsyncStorage** — local persistence for journal, settings, alerts

## Project structure

```
App.js                        Entry point
src/
  theme/index.js              Colors, fonts, radius, gradeColor()
  services/
    supabase.js               Supabase client (URL + anon key already set)
    AuthContext.js            Auth provider — user, isPremium, signIn/signUp/signOut
    signals.js                fetchSignal, fetchAllSignals, sendTelegram
    notifications.js          registerForPushNotifications, notifySignal, scheduleBackgroundScan
  navigation/
    AppNavigator.js           Bottom tab + stack navigator
  screens/
    LoginScreen.js
    PulseScreen.js            Live signal feed (free)
    ScannerScreen.js          Per-pair scanner (free)
    TradeOfDayScreen.js       Best setup of the day (premium)
    AlertsScreen.js           Push alert settings & manual scan (premium)
    BotScreen.js              MT5 bot signal feed (premium)
    JournalScreen.js          Trade logging (premium)
    PerformanceScreen.js      Win-rate stats (premium)
    SettingsScreen.js         Account, upgrade, disclaimer
  components/
    SignalCard.js             Reusable signal display card
```

## Running the app

This is a **mobile app** — it cannot be previewed in Replit's browser pane. To run it:

1. Install dependencies (already done):
   ```bash
   npm install
   ```
2. Start the Expo dev server:
   ```bash
   npx expo start
   ```
3. Scan the QR code with **Expo Go** on your Android or iOS device.

## Credentials to fill in

### Required — Backend & AI (`src/services/signals.js`)
```js
const BACKEND_URL   = 'https://your-backend.railway.app'; // replace
const ANTHROPIC_KEY = 'sk-ant-your-key';                  // replace
```

Deploy `backend.py` to Railway (free tier), then paste the URL.

### Already set — Supabase (`src/services/supabase.js`)
The Supabase URL and anon key from the README are already wired in.

### Already set — Admin password (`src/services/AuthContext.js`)
```js
const ADMIN_PASSWORD = '2222';
```
Any Supabase-registered user whose password is `2222` gets `isPremium = true` automatically.

## Building an APK

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

## User preferences

- Keep the existing file structure (`src/screens`, `src/services`, `src/navigation`, `src/components`, `src/theme`)
- Do not restructure to a monorepo or migrate the stack without asking
