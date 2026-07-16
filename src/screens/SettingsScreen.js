import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useAuth } from '../services/AuthContext';
import { colors, fonts, radius, gradeColor } from '../theme';

export default function SettingsScreen() {
  const { user, isPremium, signOut, upgradeToPremium } = useAuth();
  const [upgrading, setUpgrading] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    await upgradeToPremium();
    setUpgrading(false);
    Alert.alert('🏆 Premium Activated', 'You now have access to all premium features!');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>⚙️ Settings</Text>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Account</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Plan</Text>
          <View style={[styles.planBadge, { backgroundColor: isPremium ? '#ffd200' : colors.border }]}>
            <Text style={[styles.planText, { color: isPremium ? '#000' : colors.textMuted }]}>
              {isPremium ? '🏆 Premium' : 'Free'}
            </Text>
          </View>
        </View>
      </View>

      {/* Upgrade */}
      {!isPremium && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Go Premium</Text>
          <Text style={styles.upgradeDesc}>
            Unlock Trade of the Day, Alerts, MT5 Bot, Journal, and Performance Stats.
          </Text>
          {[
            '⚡ Live Grade A/B/C signal alerts',
            '🏆 Best trade of the day',
            '🤖 MT5 bot signal feed',
            '📓 Trade journal & logging',
            '📈 Performance analytics',
          ].map((feat, i) => (
            <Text key={i} style={styles.featureItem}>{feat}</Text>
          ))}
          <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade} disabled={upgrading}>
            <Text style={styles.upgradeBtnText}>
              {upgrading ? 'Activating…' : '🔓 Activate Premium'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* App info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ App Info</Text>
        {[
          ['App', 'Sparro FX AI'],
          ['Version', '1.0.0'],
          ['Pairs', 'EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD, GBPJPY, EURJPY, XAUUSD'],
          ['Signal grades', 'A (≥85%) · B (≥70%) · C (<70%)'],
          ['Best sessions', 'London & New York overlap'],
        ].map(([label, value]) => (
          <View key={label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Risk disclaimer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Risk Disclaimer</Text>
        <Text style={styles.disclaimer}>
          Trading forex involves substantial risk of loss. Sparro FX AI signals are
          AI-generated and for informational purposes only. Past performance does not
          guarantee future results. Never risk more than you can afford to lose. Always
          use proper risk management.
        </Text>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

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
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: fonts.sm, color: colors.textMuted, fontWeight: '600', flex: 1 },
  infoValue: { fontSize: fonts.sm, color: colors.text, flex: 2, textAlign: 'right' },
  planBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  planText: { fontSize: fonts.sm, fontWeight: '700' },
  upgradeDesc: { fontSize: fonts.sm, color: colors.textMuted, marginBottom: 12, lineHeight: 20 },
  featureItem: { fontSize: fonts.sm, color: colors.text, lineHeight: 26 },
  upgradeBtn: {
    backgroundColor: '#ffd200', borderRadius: radius.md,
    paddingVertical: 13, alignItems: 'center', marginTop: 14,
  },
  upgradeBtnText: { fontSize: fonts.lg, fontWeight: '800', color: '#000' },
  disclaimer: { fontSize: fonts.xs, color: colors.textMuted, lineHeight: 18 },
  signOutBtn: {
    backgroundColor: colors.danger + '15', borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.danger + '40', paddingVertical: 14, alignItems: 'center', marginBottom: 8,
  },
  signOutText: { fontSize: fonts.md, fontWeight: '700', color: colors.danger },
});
