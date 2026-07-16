import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../services/AuthContext';
import { fetchAllSignals, PAIRS } from '../services/signals';
import SignalCard from '../components/SignalCard';
import { colors, fonts, radius, gradeColor } from '../theme';

export default function BotScreen() {
  const { isPremium } = useAuth();
  const [running, setRunning]   = useState(false);
  const [signals, setSignals]   = useState([]);
  const [riskPct, setRiskPct]   = useState('1');
  const [lotSize, setLotSize]   = useState('0.01');
  const [gradeMin, setGradeMin] = useState('B');

  const runBot = async () => {
    setRunning(true);
    setSignals([]);
    const all = await fetchAllSignals(PAIRS);
    const gradeRank = { A: 0, B: 1, C: 2 };
    const filtered = all.filter(
      s => (gradeRank[s.grade] ?? 3) <= (gradeRank[gradeMin] ?? 3)
    );
    setSignals(filtered);
    setRunning(false);
    if (filtered.length === 0) {
      Alert.alert('No signals', `No Grade ${gradeMin}+ signals found right now. Try again later.`);
    }
  };

  if (!isPremium) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockIcon}>🤖</Text>
        <Text style={styles.lockTitle}>Premium Only</Text>
        <Text style={styles.lockSub}>Upgrade to access the MT5 Bot signal feed</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🤖 MT5 Bot</Text>
      <Text style={styles.subtitle}>AI-graded signals ready for MT5 execution</Text>

      {/* Config */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Bot Settings</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Risk per trade (%)</Text>
          <TextInput
            style={styles.input}
            value={riskPct}
            onChangeText={setRiskPct}
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Lot size</Text>
          <TextInput
            style={styles.input}
            value={lotSize}
            onChangeText={setLotSize}
            keyboardType="decimal-pad"
            placeholder="0.01"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Text style={styles.rowLabel}>Minimum grade</Text>
        <View style={styles.gradeRow}>
          {['A', 'B', 'C'].map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.gradePill, {
                backgroundColor: gradeMin === g ? gradeColor(g) : '#21262d',
                borderColor: gradeColor(g),
              }]}
              onPress={() => setGradeMin(g)}
            >
              <Text style={[styles.gradePillText, { color: gradeMin === g ? '#000' : colors.textMuted }]}>
                Grade {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Run */}
      <TouchableOpacity style={styles.runBtn} onPress={runBot} disabled={running}>
        {running
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.runBtnText}>⚡ Fetch Bot Signals</Text>}
      </TouchableOpacity>

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📋 How to use with MT5</Text>
        {[
          '1. Tap "Fetch Bot Signals" to get graded signals',
          '2. Open MT5 on your phone or PC',
          '3. Enter the trade manually using the signal details',
          '4. Set SL and TP levels as shown on each card',
          '5. Use the lot size and risk % above as your guide',
        ].map((step, i) => (
          <Text key={i} style={styles.infoStep}>{step}</Text>
        ))}
      </View>

      {/* Signals */}
      {signals.map((sig, i) => (
        <SignalCard key={i} signal={sig} />
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  title:    { fontSize: fonts.xxl, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: fonts.sm, color: colors.textMuted, marginBottom: 16 },
  section: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: fonts.lg, fontWeight: '700', color: colors.text, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rowLabel: { fontSize: fonts.sm, color: colors.textMuted, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#0a0a0f', borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: fonts.md,
    paddingHorizontal: 12, paddingVertical: 8,
    minWidth: 80, textAlign: 'right',
  },
  gradeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  gradePill: {
    flex: 1, paddingVertical: 10, borderRadius: radius.sm,
    alignItems: 'center', borderWidth: 2,
  },
  gradePillText: { fontSize: fonts.md, fontWeight: '800' },
  runBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginBottom: 14,
  },
  runBtnText: { fontSize: fonts.lg, fontWeight: '700', color: '#fff' },
  infoCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  infoTitle: { fontSize: fonts.md, fontWeight: '700', color: colors.text, marginBottom: 10 },
  infoStep:  { fontSize: fonts.sm, color: colors.textMuted, lineHeight: 22 },
  lockContainer: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockIcon:  { fontSize: 56, marginBottom: 16 },
  lockTitle: { fontSize: fonts.xxl, fontWeight: '800', color: colors.text },
  lockSub:   { fontSize: fonts.md, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
});
