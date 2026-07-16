import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../services/AuthContext';
import { fetchAllSignals, PAIRS, sendTelegram } from '../services/signals';
import { notifySignal } from '../services/notifications';
import SignalCard from '../components/SignalCard';
import { colors, fonts, radius, gradeColor } from '../theme';

export default function TradeOfDayScreen() {
  const { isPremium, user } = useAuth();
  const [best, setBest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const findBest = async () => {
    setLoading(true); setSent(false);
    const sigs = await fetchAllSignals(PAIRS);
    if (sigs.length > 0) setBest(sigs[0]);
    else setBest(null);
    setLoading(false);
  };

  const handleNotify = async () => {
    if (!best) return;
    await notifySignal(best);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  if (!isPremium) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockTitle}>Premium Only</Text>
        <Text style={styles.lockSub}>Upgrade to see Trade of the Day</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🏆 Trade of the Day</Text>
      <Text style={styles.subtitle}>Best setup across all 10 assets right now</Text>

      <TouchableOpacity style={styles.findBtn} onPress={findBest} disabled={loading}>
        <LinearGradient colors={['#ffd200','#ff9500']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.findGradient}>
          {loading ? <ActivityIndicator color="#000" /> :
            <Text style={styles.findBtnText}>🔍 Find Best Trade</Text>}
        </LinearGradient>
      </TouchableOpacity>

      {best && (
        <>
          <SignalCard signal={best} />

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.notifyBtn} onPress={handleNotify}>
              <Text style={styles.notifyBtnText}>
                {sent ? '✅ Notification Sent!' : '🔔 Push Notification'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>📋 Trade Rules</Text>
            {[
              `Direction: ${best.direction}`,
              `Only enter if Grade A or B`,
              `Use 1-2% account risk max`,
              `Take TP1 at 1:1 → move SL to breakeven`,
              `Let TP2 and TP3 run with trailing stop`,
              `Avoid entries 30 min before news`,
              `Best sessions: London & New York`,
            ].map((rule, i) => (
              <Text key={i} style={styles.ruleItem}>• {rule}</Text>
            ))}
          </View>
        </>
      )}

      {!best && !loading && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyText}>Tap "Find Best Trade" to scan all assets</Text>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  title: { fontSize: fonts.xxl, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: fonts.sm, color: colors.textMuted, marginBottom: 16 },
  findBtn: { borderRadius: radius.md, overflow: 'hidden', marginBottom: 16 },
  findGradient: { paddingVertical: 14, alignItems: 'center' },
  findBtnText: { fontSize: fonts.lg, fontWeight: '800', color: '#000' },
  actionRow: { gap: 8, marginBottom: 12 },
  notifyBtn: {
    backgroundColor: '#1a1f3a', borderRadius: radius.md,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.primary + '50',
  },
  notifyBtnText: { fontSize: fonts.md, fontWeight: '700', color: colors.primary },
  rulesCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  rulesTitle: { fontSize: fonts.lg, fontWeight: '700', color: colors.text, marginBottom: 12 },
  ruleItem: { fontSize: fonts.sm, color: colors.textMuted, lineHeight: 24 },
  lockContainer: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockIcon: { fontSize: 56, marginBottom: 16 },
  lockTitle: { fontSize: fonts.xxl, fontWeight: '800', color: colors.text },
  lockSub: { fontSize: fonts.md, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: fonts.md, color: colors.textMuted, textAlign: 'center' },
});
