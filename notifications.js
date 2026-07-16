import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications and get Expo push token
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Ask for permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sparro-signals', {
      name: 'Sparro FX AI Signals',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0072ff',
      sound: true,
    });
  }

  // Get push token
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Save token
  await AsyncStorage.setItem('expoPushToken', token);
  console.log('Push token:', token);
  return token;
}

// Send local notification (works without internet)
export async function sendLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null, // immediate
  });
}

// Send signal notification
export async function notifySignal(signal) {
  const dp = signal.entry > 100 ? 2 : 5;
  const dirEmoji = signal.direction === 'BUY' ? '🚀' : '📉';
  const gradeEmoji = signal.grade === 'A' ? '🏆' : signal.grade === 'B' ? '✅' : '⚠️';

  await sendLocalNotification(
    `${dirEmoji} ${signal.direction} ${signal.pair} — Grade ${signal.grade} ${gradeEmoji}`,
    `${signal.confidence}% confidence\nEntry: ${signal.entry?.toFixed(dp)} | SL: ${signal.sl?.toFixed(dp)} | TP1: ${signal.tp1?.toFixed(dp)}`,
    { signal }
  );
}

// Schedule background scan (every 15 minutes)
export async function scheduleBackgroundScan() {
  // Cancel existing
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule reminder to open app for scan
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚡ Sparro FX AI',
      body: 'Open app to refresh signals',
      data: { type: 'scan_reminder' },
    },
    trigger: {
      seconds: 900, // 15 minutes
      repeats: true,
    },
  });
}

export function addNotificationListener(handler) {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
