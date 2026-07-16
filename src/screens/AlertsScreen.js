import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../services/AuthContext';
import { fetchAllSignals, PAIRS } from '../services/signals';
import {
  registerForPushNotifications,
  notifySignal,
  scheduleBackgroundScan,
  sendLocalNotification,
} from '../services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, radius, gradeColor } from '../theme';

export default function AlertsScreen() {
  const { isPremium } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [autoScan, setAutoScan]       = useState(false);
  const [gradeFilter, setGradeFilter] = useState(['A', 'B']);
  const [minConf, setMinConf]         = useState(75);
  const [pushToken, setPushToken]     = useState('');
  const [scanning, setScanning]       = useState(false);
  const [lastAlerts, setLastAlerts]   = useState([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token   = await AsyncStorage.getItem('expoPushToken') || '';
      const auto    = await AsyncStorage.getItem('autoScan') === 'true';
      const grades  = JSON.parse(await AsyncStorage.getItem('gradeFilter') || '["A","B"]');
      const conf    = parseInt(await AsyncStorage.getItem('minConf') || '75');
      const alerts  = JSON.parse(await AsyncStorage.getItem('lastAlerts') || '[]');
      setPushToken(token);
      setPushEnabled(!!token);
      setAutoScan(auto);
      setGradeFilter(grades);
      setMinConf(conf);
      setLastAlerts(alerts);
    } catch (e) {}
  };

  const enablePush = async () => {
    const token = await registerForPushNotifications();
    if (token) {
      setPushToken(token);
      setPushEnabled(true);
      await AsyncStorage.setItem('expoPushToken', token);
      await sendLocalNotification(
        '✅ Sparro FX AI',
        'Push notifications enabled! You will receive Grade A/B signals.'
      );
    } else {
      Alert.alert('Permission Denied', 'Please enable notifications in your phone settings.');
    }
  };

  const disablePush = async () => {
    setPushEnabled(false);
    setPushToken('');
    await AsyncStorage.removeItem('expoPushToken');
  };

  const toggleAutoScan = async (val) => {
    setAutoScan(val);
    await AsyncStorage.setItem('autoScan', val.toString());
    if (val) {
      await scheduleBackgroundScan();
      Alert.alert('Auto-Scan On', 'You will get a reminder every 15 minutes to refresh signals.');
    }
  };

  const toggleGrade = async (grade) => {
    const newGrades = gradeFilter.includes(grade)
      ? gradeFilter.filter(g => g !== grade)
      : [...gradeFilter, grade];
    setGradeFilter(newGrades);
    await AsyncStorage.setItem('gradeFilter', JSON.stringify(newGrades));
  };

  const runManualScan = async () => {
    if (!pushEnabled) {
      Alert.alert('Enable Push First', 'Turn on push notifications to receive alerts.');
      return;
    }
    setScanning(true);
    const sigs = await fetchAllSignals(PAIRS);
    const qualifying = sigs.filter(
      s => gradeFilter.includes(s.grade) && s.confidence >= minConf
    );

    if (qualifying.length > 0) {
      for (const sig of qualifying.slice(0, 3)) {
        await notifySignal(sig);
      }
      const newAlerts = [
        ...qualifying.slice(0, 3).map(s => ({
          time: new Date().toLocaleTimeString(),
          pair: s.pair,
          direction: s.direction,
          grade: s.grade,
          confidence: s.confidence,
        })),
        ...lastAlerts,
      ].slice(0, 20);
      setLastAlerts(newAlerts);
      await AsyncStorage.setItem('lastAlerts', JSON.stringify(newAlerts));
    } else {
      await sendLocalNotification(
        '⏳ Sparro FX AI Scan',
        `No Grade ${gradeFilter.join('/')} signals above ${minConf}% right now. Check back later.`
      );
    }
    setScanning(false);
  };

  if (!isPremium) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockIcon}>🔔</Text>
        <Text style={styles.lockTitle}>Premium Only</Text>
        <Text style={styles.lockSub}>Upgrade to receive push notifications for Grade A/B signals</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🔔 Signal Alerts</Text>

      {/* Push Notifications Toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Push Notifications</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Enable Push Alerts</Text>
            <Text style={styles.rowSub}>Get notified instantly when signals fire</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={val => val ? enablePush() : disablePush()}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={pushEnabled ? '#fff' : '#8b949e'}
          />
        </View>
        {pushToken ? (
          <View style={styles.tokenBox}>
            <Text style={styles.tokenLabel}>✅ Device registered for push notifications</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.enableBtn} onPress={enablePush}>
            <Text style={styles.enableBtnText}>🔔 Enable Push Notifications</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Auto Scan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Auto-Scan Reminder</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>15-Minute Reminder</Text>
            <Text style={styles.rowSub}>Reminds you to open app and refresh signals</Text>
          </View>
          <Switch
            value={autoScan}
            onValueChange={toggleAutoScan}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={autoScan ? '#fff' : '#8b949e'}
          />
        </View>
      </View>

      {/* Grade Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Alert Filter</Text>
        <Text style={styles.filterLabel}>Alert me for grades:</Text>
        <View style={styles.gradeRow}>
          {['A','B','C'].map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.gradePill, {
                backgroundColor: gradeFilter.includes(g) ? gradeColor(g) : '#21262d',
                borderColor: gradeColor(g),
              }]}
              onPress={() => toggleGrade(g)}
            >
              <Text style={[styles.gradePillText, {
                color: gradeFilter.includes(g) ? '#000' : colors.textMuted
              }]}>Grade {g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterLabel}>Minimum confidence: {minConf}%</Text>
        <View style={styles.confRow}>
          {[60,65,70,75,80,85,90].map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.confPill, minConf===v && styles.confPillActive]}
              onPress={async () => {
                setMinConf(v);
                await AsyncStorage.setItem('minConf', v.toString());
              }}
            >
              <Text style={[styles.confPillText, minConf===v && styles.confPillTextActive]}>
                {v}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Manual Scan */}
      <TouchableOpacity style={styles.scanBtn} onPress={runManualScan} disabled={scanning}>
        {scanning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.scanBtnText}>🔍 Scan Now & Send Alerts</Text>
        )}
      </TouchableOpacity>

      {/* Recent Alerts */}
      {lastAlerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Recent Alerts</Text>
          {lastAlerts.slice(0,10).map((a, i) => {
            const dc = a.direction === 'BUY' ? colors.success : colors.danger;
            const gc = gradeColor(a.grade);
            return (
              <View key={i} style={styles.alertRow}>
                <View style={[styles.alertGrade, { backgroundColor: gc }]}>
                  <Text style={styles.alertGradeText}>{a.grade}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertPair}>{a.pair}</Text>
                  <Text style={styles.alertTime}>🕐 {a.time}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.alertDir, { color: dc }]}>{a.direction}</Text>
                  <Text style={styles.alertConf}>{a.confidence}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  title: { fontSize: fonts.xxl, fontWeight: '800', color: colors.text, marginBottom: 16 },
  section: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: fonts.lg, fontWeight: '700', color: colors.text, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rowLabel: { fontSize: fonts.md, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: fonts.sm, color: colors.textMuted, marginTop: 2 },
  tokenBox: {
    backgroundColor: '#0a1a0a', borderRadius: radius.sm,
    padding: 10, borderWidth: 1, borderColor: colors.success + '40',
  },
  tokenLabel: { fontSize: fonts.sm, color: colors.success, fontWeight: '600' },
  enableBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 12, alignItems: 'center',
  },
  enableBtnText: { fontSize: fonts.md, fontWeight: '700', color: '#fff' },
  filterLabel: { fontSize: fonts.sm, color: colors.textMuted, fontWeight: '600', marginBottom: 8 },
  gradeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  gradePill: {
    flex: 1, paddingVertical: 10, borderRadius: radius.sm,
    alignItems: 'center', borderWidth: 2,
  },
  gradePillText: { fontSize: fonts.md, fontWeight: '800' },
  confRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  confPill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm,
    backgroundColor: '#21262d', borderWidth: 1, borderColor: colors.border,
  },
  confPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  confPillText: { fontSize: fonts.sm, color: colors.textMuted, fontWeight: '600' },
  confPillTextActive: { color: '#fff' },
  scanBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginBottom: 14,
  },
  scanBtnText: { fontSize: fonts.lg, fontWeight: '700', color: '#fff' },
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  alertGrade: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  alertGradeText: { fontSize: fonts.sm, fontWeight: '800', color: '#000' },
  alertPair: { fontSize: fonts.md, fontWeight: '700', color: colors.text },
  alertTime: { fontSize: fonts.xs, color: colors.textMuted },
  alertDir: { fontSize: fonts.sm, fontWeight: '700' },
  alertConf: { fontSize: fonts.xs, color: colors.warning, fontWeight: '700' },
  lockContainer: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockIcon: { fontSize: 56, marginBottom: 16 },
  lockTitle: { fontSize: fonts.xxl, fontWeight: '800', color: colors.text },
  lockSub: { fontSize: fonts.md, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
});
