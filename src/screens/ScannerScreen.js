import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { fetchSignal, PAIRS } from '../services/signals';
import { fetchAllPrices } from '../services/market';
import { getAllNewsFlags, getTodaysEvents } from '../services/calendar';
import SignalCard from '../components/SignalCard';
import { colors, fonts, radius, gradeColor } from '../theme';

export default function ScannerScreen() {
  const [results, setResults]   = useState({});
  const [scanning, setScanning] = useState(false);
  const [prices, setPrices]     = useState({});
  const [newsFlags, setNewsFlags] = useState({});
  const [todayEvents, setTodayEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);

  // Load live prices + news flags on mount
  useEffect(() => {
    loadPricesAndNews();
  }, []);

  const loadPricesAndNews = async () => {
    setLoadingPrices(true);
    const [p, flags, events] = await Promise.all([
      fetchAllPrices(PAIRS),
      getAllNewsFlags(PAIRS, 90),
      getTodaysEvents(),
    ]);
    setPrices(p);
    setNewsFlags(flags);
    setTodayEvents(events);
    setLoadingPrices(false);
  };

  const scanAll = async () => {
    setScanning(true);
    setResults({});
    setSelected(null);
    // Scan all pairs in parallel
    const all = await Promise.allSettled(PAIRS.map(p => fetchSignal(p)));
    const map = {};
    PAIRS.forEach((p, i) => {
      if (all[i].status === 'fulfilled' && all[i].value) {
        map[p] = all[i].value;
      }
    });
    setResults(map);
    setScanning(false);
  };

  const scanOne = async (pair) => {
    setSelected(pair);
    setResults(prev => ({ ...prev, [pair]: null }));
    const sig = await fetchSignal(pair);
    setResults(prev => ({ ...prev, [pair]: sig ?? { error: true } }));
  };

  // High-impact events count for banner
  const highCount = todayEvents.filter(e => e.impact === 'High').length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>📊 Scanner</Text>
        <TouchableOpacity onPress={loadPricesAndNews} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* News banner */}
      {highCount > 0 && (
        <TouchableOpacity
          style={styles.newsBanner}
          onPress={() => setShowCalendar(v => !v)}
        >
          <Text style={styles.newsBannerText}>
            📰 {highCount} high-impact news event{highCount > 1 ? 's' : ''} today — tap to {showCalendar ? 'hide' : 'view'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Today's calendar */}
      {showCalendar && (
        <View style={styles.calendarCard}>
          <Text style={styles.calendarTitle}>📅 Today's Economic Calendar</Text>
          {todayEvents.length === 0 ? (
            <Text style={styles.calendarEmpty}>No events today</Text>
          ) : (
            todayEvents.map((e, i) => (
              <View key={i} style={styles.calendarRow}>
                <View style={[styles.impactDot, {
                  backgroundColor:
                    e.impact === 'High' ? colors.danger :
                    e.impact === 'Medium' ? colors.warning : colors.border,
                }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.calendarEvent}>{e.country} — {e.title}</Text>
                  <Text style={styles.calendarTime}>{e.time}  ·  {e.impact} impact</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Scan all */}
      <TouchableOpacity style={styles.scanAllBtn} onPress={scanAll} disabled={scanning}>
        {scanning
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.scanAllText}>⚡ Scan All {PAIRS.length} Pairs with AI</Text>}
      </TouchableOpacity>

      {scanning && (
        <Text style={styles.scanningNote}>
          Fetching live prices + running AI analysis on all pairs…
        </Text>
      )}

      {/* Pair grid */}
      <View style={styles.grid}>
        {PAIRS.map(pair => {
          const sig      = results[pair];
          const livePrice = prices[pair];
          const hasNews  = newsFlags[pair];
          const isLoading = selected === pair && sig === null;
          const gc = sig?.grade ? gradeColor(sig.grade) : null;

          return (
            <TouchableOpacity
              key={pair}
              style={[
                styles.pairCard,
                gc && { borderColor: gc },
                hasNews && styles.pairCardNews,
              ]}
              onPress={() => scanOne(pair)}
              disabled={scanning}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <View style={styles.pairTopRow}>
                    <Text style={styles.pairName}>{pair}</Text>
                    {hasNews && <Text style={styles.newsDot}>📰</Text>}
                  </View>

                  {/* Live price */}
                  {loadingPrices ? (
                    <ActivityIndicator size="small" color={colors.textMuted} style={{ marginVertical: 4 }} />
                  ) : livePrice ? (
                    <Text style={styles.livePrice}>{livePrice.toFixed(pair.includes('JPY') ? 3 : pair === 'XAUUSD' ? 2 : 5)}</Text>
                  ) : (
                    <Text style={styles.livePriceNone}>—</Text>
                  )}

                  {/* Signal result */}
                  {sig?.grade ? (
                    <>
                      <View style={[styles.gradeBadge, { backgroundColor: gc }]}>
                        <Text style={styles.gradeBadgeText}>{sig.grade}</Text>
                      </View>
                      <Text style={[styles.pairDir, {
                        color: sig.direction === 'BUY'  ? colors.success :
                               sig.direction === 'SELL' ? colors.danger  : colors.warning,
                      }]}>{sig.direction}</Text>
                      <Text style={styles.pairConf}>{sig.confidence}%</Text>
                    </>
                  ) : sig?.error ? (
                    <Text style={styles.pairError}>Failed</Text>
                  ) : (
                    <Text style={styles.pairTap}>Tap to scan</Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Signal detail card */}
      {selected && results[selected]?.grade && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.detailTitle}>Signal Detail — {selected}</Text>

          {/* News warning */}
          {results[selected]?.newsWarning ? (
            <View style={styles.newsWarningBox}>
              <Text style={styles.newsWarningText}>⚠️ {results[selected].newsWarning}</Text>
            </View>
          ) : null}

          <SignalCard signal={results[selected]} />

          {/* Indicator summary */}
          <View style={styles.indicatorCard}>
            <Text style={styles.indicatorTitle}>📐 Indicators</Text>
            <View style={styles.indicatorRow}>
              <IndBox label="RSI(14)"  value={results[selected].rsi?.toFixed(1) ?? '—'} color={
                (results[selected].rsi ?? 50) < 35 ? colors.success :
                (results[selected].rsi ?? 50) > 65 ? colors.danger : colors.text
              } />
              <IndBox label="EMA20" value={results[selected].ema20 ?? '—'} color={colors.text} />
              <IndBox label="EMA50" value={results[selected].ema50 ?? '—'} color={colors.text} />
              <IndBox label="Trend" value={results[selected].trend ?? '—'} color={
                results[selected].trend === 'Bullish' ? colors.success :
                results[selected].trend === 'Bearish' ? colors.danger : colors.warning
              } />
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function IndBox({ label, value, color }) {
  return (
    <View style={styles.indBox}>
      <Text style={styles.indLabel}>{label}</Text>
      <Text style={[styles.indValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg, padding: 12 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:        { fontSize: fonts.xxl, fontWeight: '800', color: colors.text },
  refreshBtn:   { padding: 6 },
  refreshText:  { fontSize: fonts.sm, color: colors.primary, fontWeight: '700' },

  newsBanner: {
    backgroundColor: colors.warning + '20', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.warning + '50',
    padding: 10, marginBottom: 10,
  },
  newsBannerText: { fontSize: fonts.sm, color: colors.warning, fontWeight: '700', textAlign: 'center' },

  calendarCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  calendarTitle: { fontSize: fonts.md, fontWeight: '700', color: colors.text, marginBottom: 10 },
  calendarEmpty: { fontSize: fonts.sm, color: colors.textMuted },
  calendarRow:   { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 10 },
  impactDot:     { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  calendarEvent: { fontSize: fonts.sm, color: colors.text, fontWeight: '600' },
  calendarTime:  { fontSize: fonts.xs, color: colors.textMuted, marginTop: 2 },

  scanAllBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginBottom: 8,
  },
  scanAllText:  { fontSize: fonts.lg, fontWeight: '700', color: '#fff' },
  scanningNote: { fontSize: fonts.xs, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pairCard: {
    width: '47%', backgroundColor: colors.card, borderRadius: radius.md,
    padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
    minHeight: 90, justifyContent: 'center',
  },
  pairCardNews: { borderColor: colors.warning + '80' },
  pairTopRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 },
  pairName:     { fontSize: fonts.sm, fontWeight: '700', color: colors.text },
  newsDot:      { fontSize: 10 },
  livePrice:    { fontSize: fonts.xs, color: colors.primary, fontWeight: '700', marginBottom: 4 },
  livePriceNone: { fontSize: fonts.xs, color: colors.textMuted, marginBottom: 4 },
  gradeBadge:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 3 },
  gradeBadgeText: { fontSize: fonts.xs, fontWeight: '800', color: '#000' },
  pairDir:      { fontSize: fonts.xs, fontWeight: '700' },
  pairConf:     { fontSize: fonts.xs, color: colors.textMuted, marginTop: 2 },
  pairTap:      { fontSize: fonts.xs, color: colors.textMuted, marginTop: 4 },
  pairError:    { fontSize: fonts.xs, color: colors.danger, marginTop: 4 },

  detailTitle: { fontSize: fonts.lg, fontWeight: '700', color: colors.text, marginBottom: 8 },

  newsWarningBox: {
    backgroundColor: colors.danger + '15', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.danger + '40',
    padding: 10, marginBottom: 8,
  },
  newsWarningText: { fontSize: fonts.sm, color: colors.danger, fontWeight: '600' },

  indicatorCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 14, marginTop: 8, borderWidth: 1, borderColor: colors.border,
  },
  indicatorTitle: { fontSize: fonts.sm, fontWeight: '700', color: colors.text, marginBottom: 10 },
  indicatorRow:   { flexDirection: 'row', gap: 8 },
  indBox:  { flex: 1, backgroundColor: '#0d1117', borderRadius: radius.sm, padding: 8, alignItems: 'center' },
  indLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '600', marginBottom: 3 },
  indValue: { fontSize: fonts.xs, fontWeight: '800' },
});
