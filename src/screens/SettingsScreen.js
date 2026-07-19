import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { useAuth } from '../services/AuthContext';
import { getAnthropicKey, setAnthropicKey } from '../services/signals';
import { colors, fonts, radius } from '../theme';

export default function SettingsScreen() {
  const { user, isPremium, signOut, upgradeToPremium } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const [apiKey, setApiKey]       = useState('');
  const [keySaved, setKeySaved]   = useState(false);
  const [showKey, setShowKey]     = useState(false);

  useEffect(() => {
    getAnthropicKey().then(k => {
      if (k) setApiKey(k);
    });
  }, []);

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

  const handleSaveKey = async () => {
    if (!apiKey.trim().startsWith('sk-ant-')) {
      Alert.alert('Invalid Key', 'Anthropic API keys start with "sk-ant-". Check and try again.');
      return;
    }
    await setAnthropicKey(apiKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
  };

  const handleRemoveKey = () => {
    Alert.alert('Remove API Key', 'This will remove your Anthropic key. Signals will stop working.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await setAnthropicKey('');
        setApiKey('');
      }},
    ]);
  };

  const maskedKey = apiKey.length > 10
    ? apiKey.slice(0, 10) + '••••••••••••' + apiKey.slice(-4)
    : apiKey;

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

      {/* Anthropic API Key */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 AI Engine (Anthropic)</Text>
        <Text style={styles.apiDesc}>
          The app calls Claude directly to analyse live prices and generate signals.
          Your key is stored only on this device — never sent anywhere else.
        </Text>
        <Text style={styles.apiLink}>
          Get a free key at console.anthropic.com → API Keys
        </Text>

        <View style={styles.keyRow}>
          <TextInput
            style={styles.keyInput}
            placeholder="sk-ant-api03-..."
            placeholderTextColor={colors.textMuted}
            value={showKey ? apiKey : maskedKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={false}
          />
          <TouchableOpacity onPress={() => setShowKey(v => !v)} style={styles.showBtn}>
            <Text style={styles.showBtnText}>{showKey ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.keyActions}>
          <TouchableOpacity
            style={[styles.saveKeyBtn, keySaved && { backgroundColor: colors.success }]}
            onPress={handleSaveKey}
          >
            <Text style={styles.saveKeyBtnText}>
              {keySaved ? '✅ Saved!' : '💾 Save Key'}
            </Text>
          </TouchableOpacity>
          {apiKey.length > 0 && (
            <TouchableOpacity style={styles.removeKeyBtn} onPress={handleRemoveKey}>
              <Text style={styles.removeKeyText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status */}
        <View style={[styles.statusRow, { backgroundColor: apiKey.startsWith('sk-ant-') ? colors.success + '15' : colors.danger + '15' }]}>
          <Text style={{ fontSize: fonts.xs, color: apiKey.startsWith('sk-ant-') ? colors.success : colors.danger, fontWeight: '700' }}>
            {apiKey.startsWith('sk-ant-') ? '✅ API key configured — signals active' : '⛔ No key — add your Anthropic key above to activate signals'}
          </Text>
        </View>
      </View>

      {/* Data sources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📡 Live Data Sources</Text>
        {[
          ['📈 Price Data',   'Yahoo Finance (real-time OHLCV)',   '✅ Free, no key'],
          ['📰 News Calendar','ForexFactory via faireconomy.media', '✅ Free, no key'],
          ['🤖 AI Analysis',  'Anthropic Claude Haiku',            apiKey.startsWith('sk-ant-') ? '✅ Key set' : '⚠️ Key needed'],
        ].map(([icon, source, status]) => (
          <View key={source} style={styles.sourceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceLabel}>{icon} {source}</Text>
            </View>
            <Text style={[styles.sourceStatus, {
              color: status.startsWith('✅') ? colors.success : colors.warning,
            }]}>{status}</Text>
          </View>
        ))}
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
            '🏦 Prop firm challenge tracker',
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
          ['App',           'Sparro FX AI'],
          ['Version',       '2.0.0'],
          ['Pairs',         'EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD, GBPJPY, EURJPY, XAUUSD'],
          ['AI Model',      'Claude 3 Haiku (Anthropic)'],
          ['Signal grades', 'A (≥85%) · B (≥70%) · C (<70%)'],
          ['Best sessions', 'London (08–12 UTC) & New York (13–17 UTC)'],
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
          AI-generated using real market data and are for informational purposes only.
          Past performance does not guarantee future results. Never risk more than you
          can afford to lose. Always use proper risk management.
        </Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg, padding: 12 },
  title:        { fontSize: fonts.xxl, fontWeight: '800', color: colors.text, marginBottom: 16 },
  section:      {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: fonts.lg, fontWeight: '700', color: colors.text, marginBottom: 12 },
  infoRow:      {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoLabel:  { fontSize: fonts.sm, color: colors.textMuted, fontWeight: '600', flex: 1 },
  infoValue:  { fontSize: fonts.sm, color: colors.text, flex: 2, textAlign: 'right' },
  planBadge:  { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  planText:   { fontSize: fonts.sm, fontWeight: '700' },

  apiDesc:  { fontSize: fonts.sm, color: colors.textMuted, marginBottom: 6, lineHeight: 20 },
  apiLink:  { fontSize: fonts.xs, color: colors.primary, marginBottom: 12 },

  keyRow:   { flexDirection: 'row', gap: 8, marginBottom: 10 },
  keyInput: {
    flex: 1, backgroundColor: '#0d1117', borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, color: colors.text,
    fontSize: fonts.sm, paddingHorizontal: 12, paddingVertical: 10,
  },
  showBtn:     { backgroundColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, justifyContent: 'center' },
  showBtnText: { fontSize: fonts.xs, color: colors.text, fontWeight: '700' },

  keyActions:   { flexDirection: 'row', gap: 8, marginBottom: 10 },
  saveKeyBtn:   { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  saveKeyBtnText: { fontSize: fonts.sm, fontWeight: '700', color: '#fff' },
  removeKeyBtn: { backgroundColor: colors.danger + '20', borderRadius: radius.sm, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: colors.danger + '40' },
  removeKeyText: { fontSize: fonts.xs, color: colors.danger, fontWeight: '700' },

  statusRow: { borderRadius: radius.sm, padding: 10 },

  sourceRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sourceLabel:  { fontSize: fonts.sm, color: colors.text, fontWeight: '600' },
  sourceStatus: { fontSize: fonts.xs, fontWeight: '700' },

  upgradeDesc:    { fontSize: fonts.sm, color: colors.textMuted, marginBottom: 12, lineHeight: 20 },
  featureItem:    { fontSize: fonts.sm, color: colors.text, lineHeight: 26 },
  upgradeBtn:     {
    backgroundColor: '#ffd200', borderRadius: radius.md,
    paddingVertical: 13, alignItems: 'center', marginTop: 14,
  },
  upgradeBtnText: { fontSize: fonts.lg, fontWeight: '800', color: '#000' },
  disclaimer:     { fontSize: fonts.xs, color: colors.textMuted, lineHeight: 18 },
  signOutBtn:     {
    backgroundColor: colors.danger + '15', borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.danger + '40', paddingVertical: 14, alignItems: 'center', marginBottom: 8,
  },
  signOutText: { fontSize: fonts.md, fontWeight: '700', color: colors.danger },
});
