import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { fetchAllSignals, PAIRS } from '../services/signals';
import SignalCard from '../components/SignalCard';
import { colors, fonts, radius } from '../theme';

export default function PulseScreen() {
  const [signals, setSignals]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const data = await fetchAllSignals(PAIRS);
    setSignals(data);
    setLastUpdated(new Date().toLocaleTimeString());
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  const Header = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>⚡ Live Pulse</Text>
        {lastUpdated && (
          <Text style={styles.headerSub}>Updated {lastUpdated}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.refreshBtn} onPress={() => load(false)} disabled={loading}>
        {loading
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Text style={styles.refreshBtnText}>Scan</Text>}
      </TouchableOpacity>
    </View>
  );

  const Empty = () => (
    <View style={styles.empty}>
      {loading ? (
        <>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>Scanning {PAIRS.length} assets…</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyIcon}>⚡</Text>
          <Text style={styles.emptyText}>Tap Scan to fetch live signals</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={() => load(false)}>
            <Text style={styles.scanBtnText}>Scan Now</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={signals}
      keyExtractor={(item, i) => `${item.pair}-${i}`}
      renderItem={({ item }) => <SignalCard signal={item} />}
      ListHeaderComponent={<Header />}
      ListEmptyComponent={<Empty />}
      ListFooterComponent={<View style={{ height: 100 }} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 12 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  headerTitle: { fontSize: fonts.xxl, fontWeight: '800', color: colors.text },
  headerSub:   { fontSize: fonts.xs, color: colors.textMuted, marginTop: 2 },
  refreshBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  refreshBtnText: { fontSize: fonts.sm, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: fonts.md, color: colors.textMuted, marginBottom: 20 },
  scanBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: 32, paddingVertical: 12,
  },
  scanBtnText: { fontSize: fonts.md, fontWeight: '700', color: '#fff' },
});
