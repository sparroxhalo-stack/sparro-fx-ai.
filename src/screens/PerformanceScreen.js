import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../services/AuthContext';
import { colors, fonts, radius, gradeColor } from '../theme';

export default function PerformanceScreen({ trades = [] }) {
  const { isPremium } = useAuth();

  if (!isPremium) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockIcon}>📈</Text>
        <Text style={styles.lockTitle}>Premium Only</Text>
        <Text style={styles.lockSub}>Upgrade to see performance stats</Text>
      </View>
    );
  }

  const wins       = trades.filter(t => t.result === 'Win').length;
  const losses     = trades.filter(t => t.result === 'Loss').length;
  const open       = trades.filter(t => t.result === 'Open').length;
  const total      = wins + losses;
  const winRate    = total > 0 ? Math.round(wins / total * 100) : 0;

  // By grade
  const byGrade = {};
  ['A','B','C'].forEach(g => {
    const gt = trades.filter(t => t.grade === g);
    const gw = gt.filter(t => t.result === 'Win').length;
    const gl = gt.filter(t => t.result === 'Loss').length;
    byGrade[g] = { total: gt.length, wins: gw, losses: gl, wr: gt.length > 0 ? Math.round(gw/(gw+gl||1)*100) : 0 };
  });

  // By asset
  const assets = [...new Set(trades.map(t => t.asset))];
  const byAsset = assets.map(a => {
    const at = trades.filter(t => t.asset === a);
    const aw = at.filter(t => t.result === 'Win').length;
    const al = at.filter(t => t.result === 'Loss').length;
    return { asset: a, total: at.length, wins: aw, losses: al, wr: at.length > 0 ? Math.round(aw/(aw+al||1)*100) : 0 };
  }).sort((a,b) => b.wr - a.wr);

  const MetricCard = ({ label, value, color }) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>📈 Performance</Text>

      {trades.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>Log trades in Journal to see stats</Text>
        </View>
      ) : (
        <>
          {/* Overall Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall</Text>
            <View style={styles.metricsRow}>
              <MetricCard label="Trades"    value={total} />
              <MetricCard label="Win Rate"  value={`${winRate}%`} color={winRate>=60?colors.success:winRate>=40?colors.warning:colors.danger} />
              <MetricCard label="Wins"      value={wins}   color={colors.success} />
            </View>
            <View style={styles.metricsRow}>
              <MetricCard label="Losses"    value={losses} color={colors.danger} />
              <MetricCard label="Open"      value={open}   color={colors.warning} />
              <MetricCard label="Breakeven" value={trades.filter(t=>t.result==='Breakeven').length} />
            </View>

            {/* Win rate bar */}
            <View style={styles.barBg}>
              <View style={[styles.barFill, {
                width: `${winRate}%`,
                backgroundColor: winRate>=60 ? colors.success : winRate>=40 ? colors.warning : colors.danger
              }]} />
            </View>
            <Text style={styles.barLabel}>{winRate}% win rate</Text>
          </View>

          {/* By Grade */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Signal Grade</Text>
            {['A','B','C'].map(g => {
              const gd = byGrade[g];
              if (gd.total === 0) return null;
              const gc = gradeColor(g);
              return (
                <View key={g} style={styles.gradeRow}>
                  <View style={[styles.gradeBadge, { backgroundColor: gc }]}>
                    <Text style={styles.gradeBadgeText}>{g}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.gradeLabel}>Grade {g} — {gd.total} trades</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, {
                        width: `${gd.wr}%`,
                        backgroundColor: gc,
                      }]} />
                    </View>
                  </View>
                  <Text style={[styles.gradeWr, { color: gc }]}>{gd.wr}%</Text>
                </View>
              );
            })}
          </View>

          {/* By Asset */}
          {byAsset.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>By Asset</Text>
              {byAsset.map((a, i) => (
                <View key={i} style={styles.assetRow}>
                  <Text style={styles.assetName}>{a.asset}</Text>
                  <Text style={styles.assetStats}>{a.wins}W / {a.losses}L</Text>
                  <Text style={[styles.assetWr, {
                    color: a.wr>=60 ? colors.success : a.wr>=40 ? colors.warning : colors.danger
                  }]}>{a.wr}%</Text>
                </View>
              ))}
            </View>
          )}
        </>
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
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  metricCard: {
    flex: 1, backgroundColor: '#0d1117', borderRadius: radius.sm,
    padding: 12, alignItems: 'center',
  },
  metricLabel: { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600' },
  metricValue: { fontSize: fonts.xl, fontWeight: '800', color: colors.text, marginTop: 4 },
  barBg: { backgroundColor: '#21262d', borderRadius: 4, height: 8, marginTop: 10 },
  barFill: { height: 8, borderRadius: 4 },
  barLabel: { fontSize: fonts.xs, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  gradeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  gradeBadge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  gradeBadgeText: { fontSize: fonts.sm, fontWeight: '800', color: '#000' },
  gradeLabel: { fontSize: fonts.sm, color: colors.textMuted, marginBottom: 4 },
  gradeWr: { fontSize: fonts.lg, fontWeight: '800', marginLeft: 8 },
  assetRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  assetName: { flex: 1, fontSize: fonts.md, fontWeight: '600', color: colors.text },
  assetStats: { fontSize: fonts.sm, color: colors.textMuted, marginRight: 12 },
  assetWr: { fontSize: fonts.md, fontWeight: '800', minWidth: 40, textAlign: 'right' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: fonts.md, color: colors.textMuted, textAlign: 'center' },
  lockContainer: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockIcon: { fontSize: 56, marginBottom: 16 },
  lockTitle: { fontSize: fonts.xxl, fontWeight: '800', color: colors.text },
  lockSub: { fontSize: fonts.md, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
});
