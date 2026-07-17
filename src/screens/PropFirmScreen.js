import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking,
} from 'react-native';
import { colors, fonts, radius } from '../theme';

const FIRMS = [
  {
    name: 'FTMO',
    logo: '🏆',
    website: 'https://ftmo.com',
    tagline: 'Most trusted prop firm worldwide',
    color: '#1a6cff',
    phases: ['Challenge', 'Verification', 'Funded'],
    accounts: ['$10K', '$25K', '$50K', '$100K', '$200K'],
    challenge: {
      profitTarget: '10%',
      maxDailyLoss: '5%',
      maxLoss: '10%',
      minTradingDays: 4,
      timeLimitDays: 30,
    },
    verification: {
      profitTarget: '5%',
      maxDailyLoss: '5%',
      maxLoss: '10%',
      minTradingDays: 4,
      timeLimitDays: 60,
    },
    funded: {
      profitSplit: '80% / 90%',
      maxDailyLoss: '5%',
      maxLoss: '10%',
      scaling: 'Yes — up to $2M',
    },
    tips: [
      'Never risk more than 1% per trade',
      'Avoid trading 30 min before major news',
      'Hit profit target slowly — 0.5–1% per day',
      'Trade at least 4 different days',
      'Use London & NY session only',
      'Keep a journal — FTMO reviews it',
    ],
    pairs: 'All major & minor pairs + Gold',
  },
  {
    name: 'Funded Next',
    logo: '⚡',
    website: 'https://fundednext.com',
    tagline: 'Stellar & Express models',
    color: '#7c3aed',
    phases: ['Phase 1', 'Phase 2', 'Funded'],
    accounts: ['$6K', '$15K', '$25K', '$50K', '$100K', '$200K'],
    challenge: {
      profitTarget: '10%',
      maxDailyLoss: '5%',
      maxLoss: '10%',
      minTradingDays: 5,
      timeLimitDays: 30,
    },
    verification: {
      profitTarget: '5%',
      maxDailyLoss: '5%',
      maxLoss: '10%',
      minTradingDays: 5,
      timeLimitDays: 60,
    },
    funded: {
      profitSplit: '80% → 90%',
      maxDailyLoss: '5%',
      maxLoss: '10%',
      scaling: 'Yes — up to $4M',
    },
    tips: [
      'Stellar model has no time limit — take your time',
      'Express model is 1-phase but higher target (25%)',
      'Keep daily loss under 3% to stay comfortable',
      'Withdraw as soon as possible after funding',
      'Trade only A & B grade signals from Sparro',
      'Minimum 5 trading days — spread them out',
    ],
    pairs: 'All major pairs + Gold + indices',
  },
  {
    name: 'The Funded Trader',
    logo: '💼',
    website: 'https://thefundedtrader.com',
    tagline: 'Standard & Royal challenge',
    color: '#059669',
    phases: ['Phase 1', 'Phase 2', 'Funded'],
    accounts: ['$25K', '$50K', '$100K', '$200K', '$300K'],
    challenge: {
      profitTarget: '10%',
      maxDailyLoss: '6%',
      maxLoss: '12%',
      minTradingDays: 5,
      timeLimitDays: 30,
    },
    verification: {
      profitTarget: '5%',
      maxDailyLoss: '6%',
      maxLoss: '12%',
      minTradingDays: 5,
      timeLimitDays: 60,
    },
    funded: {
      profitSplit: '80% → 90%',
      maxDailyLoss: '6%',
      maxLoss: '12%',
      scaling: 'Yes',
    },
    tips: [
      '6% daily loss gives more breathing room than FTMO',
      'Royal challenge is 1-phase — good for experienced traders',
      'News trading is allowed on some accounts',
      'Use trailing max drawdown — protect early profits',
      'Aim for 0.5% per day — consistent beats fast',
      'EA / bots allowed on Standard accounts',
    ],
    pairs: 'Forex, Gold, indices, crypto',
  },
  {
    name: 'The5ers',
    logo: '🌍',
    website: 'https://the5ers.com',
    tagline: 'Hyper growth — instant funding',
    color: '#d97706',
    phases: ['1 Phase', 'Funded'],
    accounts: ['$4K', '$10K', '$20K', '$40K', '$80K'],
    challenge: {
      profitTarget: '8%',
      maxDailyLoss: 'No daily limit',
      maxLoss: '5% trailing',
      minTradingDays: null,
      timeLimitDays: null,
    },
    verification: null,
    funded: {
      profitSplit: '50% → 100%',
      maxDailyLoss: 'No daily limit',
      maxLoss: '5% trailing',
      scaling: 'Yes — up to $4M',
    },
    tips: [
      'Trailing drawdown — be careful after early profits',
      'No time limit — perfect for slow, consistent traders',
      'Hyper Growth gives 100% profit split at scale',
      'Never let a winning trade turn into a max loss',
      'Move SL to breakeven after TP1 always',
      'Smaller lot sizes — the trailing DD is unforgiving',
    ],
    pairs: 'All major & minor forex pairs',
  },
  {
    name: 'Apex Trader Funding',
    logo: '🦅',
    website: 'https://apextraderfunding.com',
    tagline: 'Futures-focused prop firm',
    color: '#dc2626',
    phases: ['Evaluation', 'Funded'],
    accounts: ['$25K', '$50K', '$75K', '$100K', '$150K', '$250K'],
    challenge: {
      profitTarget: '$1,500 – $10,000',
      maxDailyLoss: 'No daily limit',
      maxLoss: 'Static — set at start',
      minTradingDays: 7,
      timeLimitDays: null,
    },
    verification: null,
    funded: {
      profitSplit: '100% first $25K then 90%',
      maxDailyLoss: 'No daily limit',
      maxLoss: 'Static drawdown',
      scaling: 'Multiple accounts',
    },
    tips: [
      'Futures only — NQ, ES, CL, GC contracts',
      'No daily drawdown — but static overall limit',
      'Passes run frequently — discounts common',
      'Hold overnight positions with caution on futures',
      'Set hard stop at 50% of daily ATR',
      'Best for traders who know ES/NQ price action',
    ],
    pairs: 'Futures: NQ, ES, CL, GC, 6E, ZN',
  },
  {
    name: 'My Forex Funds',
    logo: '📊',
    website: 'https://myforexfunds.com',
    tagline: 'Rapid & Evaluation accounts',
    color: '#0891b2',
    phases: ['Evaluation', 'Funded'],
    accounts: ['$5K', '$10K', '$20K', '$50K', '$100K', '$200K'],
    challenge: {
      profitTarget: '8%',
      maxDailyLoss: '5%',
      maxLoss: '12%',
      minTradingDays: 5,
      timeLimitDays: 30,
    },
    verification: null,
    funded: {
      profitSplit: '75% → 85%',
      maxDailyLoss: '5%',
      maxLoss: '12%',
      scaling: 'Yes',
    },
    tips: [
      'Rapid account is 1-phase — faster to funded',
      '12% max loss gives good buffer',
      'Consistent 1% days beats chasing targets',
      'Trade Grade A signals only for challenges',
      'Avoid Fridays — weekend gap risk',
      'Log every trade — helps if you need to dispute',
    ],
    pairs: 'All major forex pairs + Gold',
  },
];

const UNIVERSAL_TIPS = [
  { icon: '🎯', tip: 'Never risk more than 1% per trade — protect the account first' },
  { icon: '📰', tip: 'Avoid trading 30 min before & after high-impact news (NFP, CPI, FOMC)' },
  { icon: '⏰', tip: 'Trade London & New York sessions only — best liquidity & signals' },
  { icon: '📓', tip: 'Keep a trade journal — shows discipline if the firm reviews your account' },
  { icon: '🛑', tip: 'Move SL to breakeven after TP1 — never let a winner become a loser' },
  { icon: '📉', tip: 'If you lose 2 trades in a day, stop — protect your daily drawdown limit' },
  { icon: '⚡', tip: 'Only take Grade A & B signals from Sparro during a challenge' },
  { icon: '🔄', tip: 'Spread your trades across minimum trading days — don\'t rush' },
  { icon: '💤', tip: 'Close all trades before weekends — swap & gaps can kill a challenge' },
  { icon: '🧠', tip: 'Consistency over big days — 1% daily for 10 days beats 10% in one day' },
];

export default function PropFirmScreen() {
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('firms'); // 'firms' | 'tips'

  const firm = selected != null ? FIRMS[selected] : null;

  if (firm) {
    return <FirmDetail firm={firm} onBack={() => setSelected(null)} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🏦 Prop Firms</Text>
      <Text style={styles.subtitle}>Challenge guides & tips to get funded</Text>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'firms' && styles.tabActive]}
          onPress={() => setTab('firms')}
        >
          <Text style={[styles.tabText, tab === 'firms' && styles.tabTextActive]}>Firms</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'tips' && styles.tabActive]}
          onPress={() => setTab('tips')}
        >
          <Text style={[styles.tabText, tab === 'tips' && styles.tabTextActive]}>Universal Tips</Text>
        </TouchableOpacity>
      </View>

      {tab === 'firms' ? (
        <>
          <Text style={styles.sectionLabel}>Tap a firm to see challenge rules & tips</Text>
          {FIRMS.map((f, i) => (
            <TouchableOpacity key={i} style={styles.firmCard} onPress={() => setSelected(i)}>
              <View style={[styles.firmIcon, { backgroundColor: f.color + '25', borderColor: f.color + '60' }]}>
                <Text style={styles.firmEmoji}>{f.logo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.firmName}>{f.name}</Text>
                <Text style={styles.firmTagline}>{f.tagline}</Text>
                <View style={styles.phaseRow}>
                  {f.phases.map((p, j) => (
                    <View key={j} style={[styles.phasePill, { borderColor: f.color }]}>
                      <Text style={[styles.phaseText, { color: f.color }]}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <View style={styles.tipsSection}>
          <Text style={styles.sectionLabel}>Rules that apply to every prop firm challenge</Text>
          {UNIVERSAL_TIPS.map((t, i) => (
            <View key={i} style={styles.tipCard}>
              <Text style={styles.tipIcon}>{t.icon}</Text>
              <Text style={styles.tipText}>{t.tip}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function FirmDetail({ firm, onBack }) {
  const [tab, setTab] = useState('rules');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← All Firms</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={[styles.detailHeader, { borderColor: firm.color + '50' }]}>
        <Text style={styles.detailEmoji}>{firm.logo}</Text>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.detailName}>{firm.name}</Text>
          <Text style={styles.detailTagline}>{firm.tagline}</Text>
        </View>
        <TouchableOpacity
          style={[styles.websiteBtn, { backgroundColor: firm.color }]}
          onPress={() => Linking.openURL(firm.website)}
        >
          <Text style={styles.websiteBtnText}>Visit</Text>
        </TouchableOpacity>
      </View>

      {/* Account sizes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Account Sizes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {firm.accounts.map((a, i) => (
              <View key={i} style={[styles.accountPill, { borderColor: firm.color }]}>
                <Text style={[styles.accountText, { color: firm.color }]}>{a}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <Text style={styles.pairsText}>📊 {firm.pairs}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {['rules', 'funded', 'tips'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'rules' ? 'Challenge' : t === 'funded' ? 'Funded' : 'Tips'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'rules' && (
        <>
          <RuleCard title={`Phase 1 — ${firm.phases[0]}`} color={firm.color} rules={firm.challenge} />
          {firm.verification && (
            <RuleCard title={`Phase 2 — ${firm.phases[1]}`} color={firm.color} rules={firm.verification} />
          )}
        </>
      )}

      {tab === 'funded' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ {firm.phases[firm.phases.length - 1]} Account</Text>
          <Row label="Profit Split" value={firm.funded.profitSplit} color={colors.success} />
          <Row label="Max Daily Loss" value={firm.funded.maxDailyLoss} color={colors.danger} />
          <Row label="Max Drawdown" value={firm.funded.maxLoss} color={colors.danger} />
          <Row label="Scaling" value={firm.funded.scaling} color={colors.primary} />
        </View>
      )}

      {tab === 'tips' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 {firm.name} Tips</Text>
          {firm.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={[styles.tipNumber, { color: firm.color }]}>{i + 1}</Text>
              <Text style={styles.tipDetailText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function RuleCard({ title, color, rules }) {
  return (
    <View style={[styles.section, { borderColor: color + '40' }]}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <Row label="Profit Target" value={rules.profitTarget} color={colors.success} />
      <Row label="Max Daily Loss" value={rules.maxDailyLoss} color={colors.danger} />
      <Row label="Max Total Loss" value={rules.maxLoss} color={colors.danger} />
      <Row
        label="Min Trading Days"
        value={rules.minTradingDays ? `${rules.minTradingDays} days` : 'No minimum'}
        color={colors.text}
      />
      <Row
        label="Time Limit"
        value={rules.timeLimitDays ? `${rules.timeLimitDays} days` : 'No limit ✅'}
        color={colors.text}
      />
    </View>
  );
}

function Row({ label, value, color }) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Text style={[styles.ruleValue, color && { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  title:    { fontSize: fonts.xxl, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: fonts.sm, color: colors.textMuted, marginBottom: 16 },

  tabBar: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 4, marginBottom: 16 },
  tab:    { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm - 2 },
  tabActive: { backgroundColor: colors.primary },
  tabText:   { fontSize: fonts.sm, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  sectionLabel: { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600', marginBottom: 10 },

  firmCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  firmIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  firmEmoji: { fontSize: 22 },
  firmName:  { fontSize: fonts.md, fontWeight: '800', color: colors.text },
  firmTagline: { fontSize: fonts.xs, color: colors.textMuted, marginTop: 2 },
  phaseRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  phasePill: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  phaseText: { fontSize: 10, fontWeight: '700' },
  chevron:  { fontSize: 22, color: colors.textMuted },

  tipsSection: { gap: 0 },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  tipIcon: { fontSize: 20, marginTop: 1 },
  tipText: { flex: 1, fontSize: fonts.sm, color: colors.text, lineHeight: 20 },

  // Detail
  backBtn: { marginBottom: 14 },
  backText: { fontSize: fonts.md, color: colors.primary, fontWeight: '700' },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, marginBottom: 12, borderWidth: 1,
  },
  detailEmoji: { fontSize: 36 },
  detailName:  { fontSize: fonts.xl, fontWeight: '900', color: colors.text },
  detailTagline: { fontSize: fonts.xs, color: colors.textMuted, marginTop: 3 },
  websiteBtn: { borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 7 },
  websiteBtnText: { fontSize: fonts.sm, fontWeight: '700', color: '#fff' },

  section: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: fonts.lg, fontWeight: '700', color: colors.text, marginBottom: 12 },

  accountPill: { borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  accountText: { fontSize: fonts.sm, fontWeight: '700' },
  pairsText: { fontSize: fonts.xs, color: colors.textMuted, marginTop: 10 },

  ruleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  ruleLabel: { fontSize: fonts.sm, color: colors.textMuted, flex: 1 },
  ruleValue: { fontSize: fonts.sm, fontWeight: '700', color: colors.text },

  tipRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  tipNumber: { fontSize: fonts.md, fontWeight: '900', minWidth: 20 },
  tipDetailText: { flex: 1, fontSize: fonts.sm, color: colors.text, lineHeight: 20 },
});
