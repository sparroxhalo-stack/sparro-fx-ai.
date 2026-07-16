import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { fetchSignal, PAIRS } from '../services/signals';
import SignalCard from '../components/SignalCard';
import { colors, fonts, radius, gradeColor } from '../theme';

export default function ScannerScreen() {
  const [results, setResults]   = useState({});
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState(null);

  const scanAll = async () => {
    setScanning(true);
    setResults({});
    setSelected(null);
    for (const pair of PAIRS) {
      const sig = await fetchSignal(pair);
      if (sig) setResults(prev => ({ ...prev, [pair]: sig }));
    }
    setScanning(false);
  };

  const scanOne = async (pair) => {
    setSelected(pair);
    setResults(prev => ({ ...prev, [pair]: null }));
    const sig = await fetchSignal(pair);
    setResults(prev => ({ ...prev, [pair]: sig ?? { error: true } }));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>📊 Market Scanner</Text>

      {/* Scan All Button */}
      <TouchableOpacity style={styles.scanAllBtn} onPress={scanAll} disabled={scanning}>
        {scanning
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.scanAllText}>🔍 Scan All {PAIRS.length} Assets</Text>}
      </TouchableOpacity>

      {/* Pair Grid */}
      <View style={styles.grid}>
        {PAIRS.map(pair => {
          const sig = results[pair];
          const isLoading = selected === pair && sig === null;
          const gc = sig?.grade ? gradeColor(sig.grade) : colors.border;
          return (
            <TouchableOpacity
              key={pair}
              style={[styles.pairCard, sig?.grade && { borderColor: gc }]}
              onPress={() => scanOne(pair)}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Text style={styles.pairName}>{pair}</Text>
                  {sig?.grade ? (
                    <>
                      <View style={[styles.gradeBadge, { backgroundColor: gc }]}>
                        <Text style={styles.gradeBadgeText}>{sig.grade}</Text>
                      </View>
                      <Text style={[styles.pairDir, {
                        color: sig.direction === 'BUY' ? colors.success : colors.danger
                      }]}>{sig.direction}</Text>
                      <Text style={styles.pairConf}>{sig.confidence}%</Text>
                    </>
                  ) : (
                    <Text style={styles.pairTap}>Tap</Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Signal details for selected pair */}
      {selected && results[selected]?.grade && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.detailTitle}>Signal Detail — {selected}</Text>
          <SignalCard signal={results[selected]} />
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  title: { fontSize: fonts.xxl, fontWeight: '800', color: colors.text, marginBottom: 16 },
  scanAllBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginBottom: 16,
  },
  scanAllText: { fontSize: fonts.lg, fontWeight: '700', color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pairCard: {
    width: '47%', backgroundColor: colors.card, borderRadius: radius.md,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    minHeight: 80, justifyContent: 'center',
  },
  pairName: { fontSize: fonts.sm, fontWeight: '700', color: colors.text, marginBottom: 6 },
  gradeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  gradeBadgeText: { fontSize: fonts.xs, fontWeight: '800', color: '#000' },
  pairDir: { fontSize: fonts.xs, fontWeight: '700' },
  pairConf: { fontSize: fonts.xs, color: colors.textMuted, marginTop: 2 },
  pairTap: { fontSize: fonts.xs, color: colors.textMuted },
  detailTitle: { fontSize: fonts.lg, fontWeight: '700', color: colors.text, marginBottom: 8 },
});
