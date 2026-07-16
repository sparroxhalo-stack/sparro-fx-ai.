import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radius, gradeColor } from '../theme';

/**
 * Reusable signal card.
 * Expected signal shape:
 *   { pair, direction, grade, confidence, entry, sl, tp1, tp2, tp3, reason }
 */
export default function SignalCard({ signal }) {
  if (!signal) return null;

  const { pair, direction, grade, confidence, entry, sl, tp1, tp2, tp3, reason } = signal;
  const gc  = gradeColor(grade);
  const dc  = direction === 'BUY' ? colors.success : colors.danger;
  const dp  = entry > 100 ? 2 : 5;
  const fmt = (v) => (v != null ? Number(v).toFixed(dp) : '—');

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.gradeBadge, { backgroundColor: gc }]}>
          <Text style={styles.gradeText}>{grade}</Text>
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.pair}>{pair}</Text>
          <Text style={styles.conf}>{confidence}% confidence</Text>
        </View>

        <View style={[styles.dirBadge, { backgroundColor: dc + '20', borderColor: dc }]}>
          <Text style={[styles.dirText, { color: dc }]}>
            {direction === 'BUY' ? '▲' : '▼'} {direction}
          </Text>
        </View>
      </View>

      {/* Price levels */}
      <View style={styles.levels}>
        <LevelCol label="Entry" value={fmt(entry)} color={colors.text} />
        <LevelCol label="SL"    value={fmt(sl)}    color={colors.danger} />
        <LevelCol label="TP1"   value={fmt(tp1)}   color={colors.success} />
        <LevelCol label="TP2"   value={fmt(tp2)}   color={colors.success} />
        <LevelCol label="TP3"   value={fmt(tp3)}   color={colors.success} />
      </View>

      {/* Confidence bar */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, {
          width: `${confidence ?? 0}%`,
          backgroundColor: gc,
        }]} />
      </View>

      {/* AI reason */}
      {reason ? (
        <Text style={styles.reason} numberOfLines={3}>{reason}</Text>
      ) : null}
    </View>
  );
}

function LevelCol({ label, value, color }) {
  return (
    <View style={styles.levelCol}>
      <Text style={styles.levelLabel}>{label}</Text>
      <Text style={[styles.levelValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeBadge: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  gradeText: {
    fontSize: fonts.md, fontWeight: '900', color: '#000',
  },
  pair: {
    fontSize: fonts.lg, fontWeight: '800', color: colors.text,
  },
  conf: {
    fontSize: fonts.xs, color: colors.textMuted, marginTop: 1,
  },
  dirBadge: {
    borderRadius: radius.sm, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  dirText: {
    fontSize: fonts.sm, fontWeight: '800',
  },
  levels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  levelCol: {
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: fonts.xs, color: colors.textMuted,
    fontWeight: '600', marginBottom: 3,
  },
  levelValue: {
    fontSize: fonts.xs, fontWeight: '700',
  },
  barBg: {
    backgroundColor: '#21262d', borderRadius: 4, height: 5, marginBottom: 10,
  },
  barFill: {
    height: 5, borderRadius: 4,
  },
  reason: {
    fontSize: fonts.xs, color: colors.textMuted, lineHeight: 17,
    fontStyle: 'italic',
  },
});
