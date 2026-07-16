# 🚀 Sparro FX AI — React Native App

## Setup in 5 steps

### 1. Install dependencies
```bash
cd SparroFXAI
npm install
```

### 2. Fill in your credentials

**src/services/supabase.js**
```js
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybWF6aWtxbXJqeGZ2dndtZ3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzIzNTQsImV4cCI6MjA5OTEwODM1NH0.zrKPKZwsPcRjIxa0ogTsmUyZtJsEdPUHV8dakw1soyU';
```

**src/services/AuthContext.js**
```js
const ADMIN_PASSWORD = '2222';
```

**src/services/signals.js**
```js
const BACKEND_URL  = 'https://your-backend.railway.app';
const ANTHROPIC_KEY = 'sk-ant-your-key';
```

### 3. Deploy the backend (FREE on Railway)
1. Go to railway.app → New Project → Deploy from GitHub
2. Add backend.py + requirements.txt
3. Start command: `uvicorn backend:app --host 0.0.0.0 --port $PORT`
4. Copy URL → paste as BACKEND_URL above

### 4. Run on your phone
```bash
npx expo start
```
Scan QR code with **Expo Go** app

### 5. Build APK for Android
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK (takes ~5 min, free)
eas build --platform android --profile preview
```
Download the APK link → install on any Android phone

## Build for Play Store
```bash
eas build --platform android --profile production
eas submit --platform android
```

## Features
- ⚡ Live Pulse with Grade A/B/C signals
- 🏆 Trade of the Day
- 🔔 Real push notifications (works when app is closed)
- 📊 Market Scanner
- 📓 Trade Journal
- 📈 Performance Dashboard
- 🔐 Supabase login
- 🤖 AI Strategy Builder

## Push Notifications
- Works even when app is in background
- 15-minute scan reminder
- Manual scan + instant alert
- Filter by Grade A, B, C
- Filter by minimum confidence %
