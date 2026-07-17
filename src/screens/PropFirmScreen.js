import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllSignals, PAIRS } from '../services/signals';
import SignalCard from '../components/SignalCard';
import { colors, fonts, radius, gradeColor } from '../theme';

// ── Prop firm definitions ────────────────────────────────────────────────────
const FIRMS = [
  {
    name: 'FTMO',
    logo: '🏆',
    color: '#1a6cff',
    phases: [
      { label: 'Challenge (Phase 1)', profitTarget: 10, maxDaily: 5, maxTotal: 10, minDays: 4 },
      { label: 'Verification (Phase 2)', profitTarget: 5, maxDaily: 5, maxTotal: 10, minDays: 4 },
    ],
  },
  {
    name: 'Funded Next',
    logo: '⚡',
    color: '#7c3aed',
    phases: [
      { label: 'Phase 1', profitTarget: 10, maxDaily: 5, maxTotal: 10, minDays: 5 },
      { label: 'Phase 2', profitTarget: 5, maxDaily: 5, maxTotal: 10, minDays: 5 },
    ],
  },
  {
    name: 'The Funded Trader',
    logo: '💼',
    color: '#059669',
    phases: [
      { label: 'Standard Phase 1', profitTarget: 10, maxDaily: 6, maxTotal: 12, minDays: 5 },
      { label: 'Standard Phase 2', profitTarget: 5, maxDaily: 6, maxTotal: 12, minDays: 5 },
    ],
  },
  {
    name: 'The5ers',
    logo: '🌍',
    color: '#d97706',
    phases: [
      { label: 'Hyper Growth', profitTarget: 8, maxDaily: 4, maxTotal: 5, minDays: 0 },
    ],
  },
  {
    name: 'My Forex Funds',
    logo: '📊',
    color: '#0891b2',
    phases: [
      { label: 'Rapid (1-Phase)', profitTarget: 8, maxDaily: 5, maxTotal: 12, minDays: 5 },
      { label: 'Evaluation Phase 1', profitTarget: 8, maxDaily: 5, maxTotal: 12, minDays: 5 },
    ],
  },
  {
    name: 'Funded Engineer',
    logo: '🔧',
    color: '#e11d48',
    phases: [
      { label: 'Phase 1', profitTarget: 8, maxDaily: 5, maxTotal: 8, minDays: 5 },
      { label: 'Phase 2', profitTarget: 5, maxDaily: 5, maxTotal: 8, minDays: 5 },
    ],
  },
];

const ACCOUNT_SIZES = ['5,000', '10,000', '25,000', '50,000', '100,000', '200,000'];
const STORAGE_KEY = 'propFirmChallenge';

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcLotSize(accountSize, riskPct, sl, entry, pair) {
  const riskAmount = (accountSize * riskPct) / 100;
  const pipsAtRisk = Math.abs(entry - sl);
  if (!pipsAtRisk) return '0.01';
  // pip value ≈ $10 per pip per standard lot for most pairs; Gold ≈ $1/pip/lot * 100
  const pipValue = pair === 'XAUUSD' ? 1 : 10;
  const pipSize  = pair === 'XAUUSD' ? 0.01 : (entry > 50 ? 0.01 : 0.0001);
  const pips = pipsAtRisk / pipSize;
  const lots = riskAmount / (pips * pipValue);
  return Math.max(0.01, Math.round(lots * 100) / 100).toFixed(2);
}

function barColor(usedPct) {
  if (usedPct >= 80) return colors.danger;
  if (usedPct >= 50) return colors.warning;
  return colors.success;
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function PropFirmScreen() {
  const [challenge, setChallenge] = useState(null); // active challenge state
  const [setupModal, setSetupModal] = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => { loadChallenge(); }, []);

  const loadChallenge = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setChallenge(raw ? JSON.parse(raw) : null);
    } catch {}
    setLoading(false);
  };

  const saveChallenge = async (data) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setChallenge(data);
  };

  const resetChallenge = () => {
    Alert.alert('Reset Challenge', 'This will clear all progress. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setChallenge(null);
      }},
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {challenge
        ? <ChallengeTracker challenge={challenge} onSave={saveChallenge} onReset={resetChallenge} />
        : <SetupScreen onStart={(data) => { saveChallenge(data); }} />
      }
    </View>
  );
}

// ── Setup screen — choose firm, phase, account size ──────────────────────────
function SetupScreen({ onStart }) {
  const [firmIdx, setFirmIdx]   = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [size, setSize]         = useState('10,000');
  const [customSize, setCustomSize] = useState('');

  const firm  = FIRMS[firmIdx];
  const phase = firm.phases[phaseIdx];
  const accountSize = parseFloat((customSize || size).replace(/,/g, ''));

  const start = () => {
    if (!accountSize || isNaN(accountSize)) {
      Alert.alert('Account size required', 'Please enter your account balance.');
      return;
    }
    const now = new Date().toLocaleDateString();
    onStart({
      firmIdx,
      phaseIdx,
      accountSize,
      startBalance: accountSize,
      currentBalance: accountSize,
      dailyStartBalance: accountSize,
      dailyLossUsed: 0,
      totalLossUsed: 0,
      profitEarned: 0,
      daysTraded: 0,
      tradesLogged: [],
      lastTradingDay: now,
      startDate: now,
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🏦 Start Your Challenge</Text>
      <Text style={styles.subtitle}>Set up your prop firm account and we'll guide every trade</Text>

      {/* Firm selector */}
      <Text style={styles.label}>Select Prop Firm</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {FIRMS.map((f, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.firmChip, firmIdx === i && { backgroundColor: f.color + '25', borderColor: f.color }]}
            onPress={() => { setFirmIdx(i); setPhaseIdx(0); }}
          >
            <Text style={styles.firmChipEmoji}>{f.logo}</Text>
            <Text style={[styles.firmChipText, firmIdx === i && { color: f.color }]}>{f.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Phase selector */}
      <Text style={styles.label}>Challenge Phase</Text>
      <View style={styles.phaseRow}>
        {firm.phases.map((p, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.phaseChip, phaseIdx === i && { backgroundColor: firm.color + '25', borderColor: firm.color }]}
            onPress={() => setPhaseIdx(i)}
          >
            <Text style={[styles.phaseChipText, phaseIdx === i && { color: firm.color }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rules preview */}
      <View style={[styles.rulesCard, { borderColor: firm.color + '50' }]}>
        <Text style={[styles.rulesTitle, { color: firm.color }]}>{firm.logo} {firm.name} — {phase.label}</Text>
        <RuleRow label="🎯 Profit Target"   value={`${phase.profitTarget}%  ($${((accountSize || 10000) * phase.profitTarget / 100).toLocaleString()})`} color={colors.success} />
        <RuleRow label="📉 Max Daily Loss"  value={`${phase.maxDaily}%  ($${((accountSize || 10000) * phase.maxDaily / 100).toLocaleString()})`} color={colors.danger} />
        <RuleRow label="🔻 Max Total Loss"  value={`${phase.maxTotal}%  ($${((accountSize || 10000) * phase.maxTotal / 100).toLocaleString()})`} color={colors.danger} />
        <RuleRow label="📅 Min Trading Days" value={phase.minDays > 0 ? `${phase.minDays} days` : 'No minimum'} color={colors.text} />
      </View>

      {/* Account size */}
      <Text style={styles.label}>Account Size ($)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {ACCOUNT_SIZES.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.sizeChip, size === s && !customSize && styles.sizeChipActive]}
            onPress={() => { setSize(s); setCustomSize(''); }}
          >
            <Text style={[styles.sizeChipText, size === s && !customSize && styles.sizeChipTextActive]}>${s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TextInput
        style={styles.input}
        placeholder="Or type custom amount e.g. 15000"
        placeholderTextColor={colors.textMuted}
        value={customSize}
        onChangeText={setCustomSize}
        keyboardType="numeric"
      />

      <TouchableOpacity style={[styles.startBtn, { backgroundColor: firm.color }]} onPress={start}>
        <Text style={styles.startBtnText}>🚀 Start Challenge</Text>
      </TouchableOpacity>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

// ── Active challenge tracker ─────────────────────────────────────────────────
function ChallengeTracker({ challenge, onSave, onReset }) {
  const firm  = FIRMS[challenge.firmIdx];
  const phase = firm.phases[challenge.phaseIdx];
  const [signals, setSignals]   = useState([]);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab]           = useState('dashboard'); // dashboard | trades | signals

  const accountSize   = challenge.accountSize;
  const profitPct     = ((challenge.currentBalance - challenge.startBalance) / challenge.startBalance * 100);
  const dailyLossPct  = (challenge.dailyLossUsed / accountSize * 100);
  const totalLossPct  = (challenge.totalLossUsed / accountSize * 100);
  const targetPct     = phase.profitTarget;
  const progressPct   = Math.min(100, (profitPct / targetPct) * 100);

  const dailyBudgetLeft  = (accountSize * phase.maxDaily / 100) - challenge.dailyLossUsed;
  const totalBudgetLeft  = (accountSize * phase.maxTotal / 100) - challenge.totalLossUsed;
  const targetRemaining  = (accountSize * targetPct / 100) - challenge.profitEarned;

  // Reset daily loss at start of new trading day
  const checkNewDay = async () => {
    const today = new Date().toLocaleDateString();
    if (challenge.lastTradingDay !== today) {
      const updated = {
        ...challenge,
        dailyLossUsed: 0,
        dailyStartBalance: challenge.currentBalance,
        lastTradingDay: today,
      };
      await onSave(updated);
    }
  };

  useEffect(() => { checkNewDay(); }, []);

  const scanSignals = async () => {
    setScanning(true);
    setTab('signals');
    // Only A & B grade during challenge
    const all = await fetchAllSignals(PAIRS);
    const safe = all.filter(s => ['A', 'B'].includes(s.grade));
    setSignals(safe);
    setScanning(false);
  };

  const logTrade = (sig, result, pnlAmount) => {
    const pnl = parseFloat(pnlAmount);
    if (isNaN(pnl)) return;

    const today = new Date().toLocaleDateString();
    const newBalance = challenge.currentBalance + pnl;
    const profitEarned = Math.max(0, challenge.profitEarned + pnl);
    const dailyLossUsed = pnl < 0 ? challenge.dailyLossUsed + Math.abs(pnl) : challenge.dailyLossUsed;
    const totalLossUsed = pnl < 0 ? challenge.totalLossUsed + Math.abs(pnl) : challenge.totalLossUsed;

    // Check breach
    if (dailyLossUsed > accountSize * phase.maxDaily / 100) {
      Alert.alert('⛔ Daily Loss Limit Breached!', `You have exceeded the ${phase.maxDaily}% daily loss limit. STOP trading today immediately.`);
    } else if (totalLossUsed > accountSize * phase.maxTotal / 100) {
      Alert.alert('⛔ Max Drawdown Breached!', `You have exceeded the ${phase.maxTotal}% max loss. Your challenge may be failed.`);
    } else if (profitEarned >= accountSize * targetPct / 100) {
      Alert.alert('🎉 Profit Target Hit!', `You've reached the ${targetPct}% profit target! Well done! Ensure you've met the minimum trading days requirement.`);
    }

    const tradeEntry = {
      id: Date.now(),
      pair: sig?.pair || '—',
      direction: sig?.direction || '—',
      grade: sig?.grade || '—',
      result,
      pnl,
      date: today,
      balance: newBalance,
    };

    const updated = {
      ...challenge,
      currentBalance: newBalance,
      profitEarned,
      dailyLossUsed,
      totalLossUsed,
      daysTraded: challenge.lastTradingDay !== today ? challenge.daysTraded + 1 : challenge.daysTraded,
      lastTradingDay: today,
      tradesLogged: [tradeEntry, ...challenge.tradesLogged],
    };
    onSave(updated);
  };

  const dangerLevel = dailyLossPct >= 80 || totalLossPct >= 80;

  return (
    <View style={{ flex: 1 }}>
      {/* Danger banner */}
      {dangerLevel && (
        <View style={styles.dangerBanner}>
          <Text style={styles.dangerText}>
            ⛔ WARNING — You are near your loss limit. Stop trading now to protect your challenge.
          </Text>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.topTabBar}>
        {['dashboard', 'signals', 'trades'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.topTab, tab === t && styles.topTabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.topTabText, tab === t && styles.topTabTextActive]}>
              {t === 'dashboard' ? '📊 Dashboard' : t === 'signals' ? '⚡ Trades' : '📋 History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <>
            {/* Firm header */}
            <View style={[styles.firmHeader, { borderColor: firm.color + '50' }]}>
              <Text style={styles.firmHeaderEmoji}>{firm.logo}</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.firmHeaderName}>{firm.name}</Text>
                <Text style={styles.firmHeaderPhase}>{phase.label}</Text>
              </View>
              <TouchableOpacity onPress={onReset}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Progress to target */}
            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>🎯 Challenge Progress</Text>
                <Text style={[styles.bigPct, { color: profitPct >= 0 ? colors.success : colors.danger }]}>
                  {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, {
                  width: `${Math.max(0, progressPct)}%`,
                  backgroundColor: firm.color,
                }]} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.barLabel}>0%</Text>
                <Text style={styles.barLabel}>Target: {targetPct}%</Text>
              </View>
              <View style={styles.statsRow}>
                <StatBox label="Balance"  value={`$${challenge.currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color={colors.text} />
                <StatBox label="P&L"      value={`${profitPct >= 0 ? '+' : ''}$${(challenge.currentBalance - challenge.startBalance).toFixed(0)}`} color={profitPct >= 0 ? colors.success : colors.danger} />
                <StatBox label="Still Need" value={`$${Math.max(0, targetRemaining).toFixed(0)}`} color={colors.warning} />
              </View>
            </View>

            {/* Daily loss gauge */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📉 Daily Loss Used</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, {
                  width: `${Math.min(100, dailyLossPct)}%`,
                  backgroundColor: barColor(dailyLossPct),
                }]} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.barLabel}>${challenge.dailyLossUsed.toFixed(0)} used</Text>
                <Text style={styles.barLabel}>{dailyLossPct.toFixed(1)}% of {phase.maxDaily}% limit</Text>
              </View>
              <Text style={[styles.budgetText, { color: dailyBudgetLeft < 200 ? colors.danger : colors.success }]}>
                ${Math.max(0, dailyBudgetLeft).toFixed(0)} remaining today
              </Text>
            </View>

            {/* Total drawdown gauge */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔻 Total Drawdown Used</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, {
                  width: `${Math.min(100, totalLossPct)}%`,
                  backgroundColor: barColor(totalLossPct),
                }]} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.barLabel}>${challenge.totalLossUsed.toFixed(0)} used</Text>
                <Text style={styles.barLabel}>{totalLossPct.toFixed(1)}% of {phase.maxTotal}% limit</Text>
              </View>
              <Text style={[styles.budgetText, { color: totalBudgetLeft < 500 ? colors.danger : colors.success }]}>
                ${Math.max(0, totalBudgetLeft).toFixed(0)} max loss buffer remaining
              </Text>
            </View>

            {/* Min days */}
            {phase.minDays > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📅 Trading Days</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {
                    width: `${Math.min(100, (challenge.daysTraded / phase.minDays) * 100)}%`,
                    backgroundColor: colors.primary,
                  }]} />
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.barLabel}>{challenge.daysTraded} days traded</Text>
                  <Text style={styles.barLabel}>Minimum: {phase.minDays} days</Text>
                </View>
              </View>
            )}

            {/* Rules reminder */}
            <View style={[styles.rulesCard, { borderColor: firm.color + '40' }]}>
              <Text style={[styles.rulesTitle, { color: firm.color }]}>⚠️ Challenge Rules</Text>
              <RuleRow label="Max daily loss"  value={`${phase.maxDaily}%  ($${(accountSize * phase.maxDaily / 100).toLocaleString()})`} color={colors.danger} />
              <RuleRow label="Max total loss"  value={`${phase.maxTotal}%  ($${(accountSize * phase.maxTotal / 100).toLocaleString()})`} color={colors.danger} />
              <RuleRow label="Profit target"   value={`${phase.profitTarget}%  ($${(accountSize * phase.profitTarget / 100).toLocaleString()})`} color={colors.success} />
              <RuleRow label="Min trading days" value={phase.minDays > 0 ? `${phase.minDays} days` : 'No minimum'} color={colors.text} />
            </View>

            {/* Get trades CTA */}
            <TouchableOpacity style={styles.scanBtn} onPress={scanSignals} disabled={scanning}>
              {scanning ? <ActivityIndicator color="#fff" /> :
                <Text style={styles.scanBtnText}>⚡ Get Trades for My Challenge</Text>}
            </TouchableOpacity>

            {/* Daily rules */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Today's Rules</Text>
              {[
                dailyBudgetLeft < (accountSize * 0.02)
                  ? '🛑 Stop trading — daily loss limit almost hit'
                  : `✅ You can still lose up to $${dailyBudgetLeft.toFixed(0)} today`,
                `🎯 Risk max 1% per trade = $${(accountSize * 0.01).toFixed(0)}`,
                '📰 Check forex calendar — avoid news windows',
                '⏰ Trade London (8–12 UTC) or NY (13–17 UTC) only',
                '🔒 Grade A & B signals only — no Grade C during challenge',
              ].map((tip, i) => (
                <Text key={i} style={styles.dailyTip}>{tip}</Text>
              ))}
            </View>
          </>
        )}

        {/* ── SIGNALS / TRADES ── */}
        {tab === 'signals' && (
          <>
            <Text style={styles.title}>⚡ Challenge Trades</Text>
            <Text style={styles.subtitle}>Grade A & B signals only — sized for your account</Text>

            <TouchableOpacity style={styles.scanBtn} onPress={scanSignals} disabled={scanning}>
              {scanning ? <ActivityIndicator color="#fff" /> :
                <Text style={styles.scanBtnText}>🔍 Scan for New Trades</Text>}
            </TouchableOpacity>

            {scanning && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.scanningText}>Scanning all pairs for challenge-safe signals…</Text>
              </View>
            )}

            {!scanning && signals.length === 0 && (
              <View style={styles.center}>
                <Text style={styles.emptyIcon}>⚡</Text>
                <Text style={styles.emptyText}>Tap Scan to get trades calibrated{'\n'}to your challenge rules</Text>
              </View>
            )}

            {signals.map((sig, i) => {
              const lots = calcLotSize(accountSize, 1, sig.sl, sig.entry, sig.pair);
              const riskAmt = (accountSize * 0.01).toFixed(0);
              return (
                <View key={i}>
                  <SignalCard signal={sig} />
                  {/* Position size guidance */}
                  <View style={styles.sizeCard}>
                    <Text style={styles.sizeTitle}>📐 Position Size for Your Account</Text>
                    <View style={styles.sizeRow}>
                      <View style={styles.sizeBox}>
                        <Text style={styles.sizeLabel}>Lot Size</Text>
                        <Text style={styles.sizeValue}>{lots}</Text>
                      </View>
                      <View style={styles.sizeBox}>
                        <Text style={styles.sizeLabel}>Risk Amount</Text>
                        <Text style={[styles.sizeValue, { color: colors.danger }]}>${riskAmt}</Text>
                      </View>
                      <View style={styles.sizeBox}>
                        <Text style={styles.sizeLabel}>Account</Text>
                        <Text style={styles.sizeValue}>${accountSize.toLocaleString()}</Text>
                      </View>
                    </View>
                    <LogTradeRow signal={sig} onLog={(result, pnl) => logTrade(sig, result, pnl)} />
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── HISTORY ── */}
        {tab === 'trades' && (
          <>
            <Text style={styles.title}>📋 Trade History</Text>
            {challenge.tradesLogged.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No trades logged yet.{'\n'}Take a trade and log the result.</Text>
              </View>
            ) : (
              challenge.tradesLogged.map((t, i) => {
                const pnlColor = t.pnl >= 0 ? colors.success : colors.danger;
                const gc = gradeColor(t.grade);
                return (
                  <View key={t.id || i} style={styles.historyCard}>
                    <View style={styles.rowBetween}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.gradeCircle, { backgroundColor: gc }]}>
                          <Text style={styles.gradeCircleText}>{t.grade}</Text>
                        </View>
                        <View>
                          <Text style={styles.historyPair}>{t.pair}</Text>
                          <Text style={styles.historyDate}>{t.date}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.historyPnl, { color: pnlColor }]}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(0)}
                        </Text>
                        <Text style={[styles.historyDir, {
                          color: t.direction === 'BUY' ? colors.success : colors.danger,
                        }]}>{t.direction} · {t.result}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ── Log trade inline row ─────────────────────────────────────────────────────
function LogTradeRow({ signal, onLog }) {
  const [pnl, setPnl]       = useState('');
  const [result, setResult] = useState('Win');
  const [show, setShow]     = useState(false);

  if (!show) {
    return (
      <TouchableOpacity style={styles.logOpenBtn} onPress={() => setShow(true)}>
        <Text style={styles.logOpenText}>+ Log This Trade</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.logForm}>
      <Text style={styles.logLabel}>Result</Text>
      <View style={styles.resultRow}>
        {['Win', 'Loss', 'Breakeven'].map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.resultChip, result === r && {
              backgroundColor:
                r === 'Win' ? colors.success + '30' :
                r === 'Loss' ? colors.danger + '30' : colors.warning + '30',
              borderColor:
                r === 'Win' ? colors.success : r === 'Loss' ? colors.danger : colors.warning,
            }]}
            onPress={() => setResult(r)}
          >
            <Text style={[styles.resultChipText, result === r && {
              color: r === 'Win' ? colors.success : r === 'Loss' ? colors.danger : colors.warning,
            }]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.logLabel}>P&L Amount ($) — use negative for a loss e.g. -120</Text>
      <TextInput
        style={styles.pnlInput}
        value={pnl}
        onChangeText={setPnl}
        keyboardType="numbers-and-punctuation"
        placeholder="+200 or -150"
        placeholderTextColor={colors.textMuted}
      />
      <TouchableOpacity style={styles.logSaveBtn} onPress={() => {
        onLog(result, pnl);
        setPnl(''); setShow(false);
      }}>
        <Text style={styles.logSaveBtnText}>✅ Save Trade</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Small helper components ──────────────────────────────────────────────────
function StatBox({ label, value, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function RuleRow({ label, value, color }) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Text style={[styles.ruleValue, { color }]}>{value}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: 60 },
  title:     { fontSize: fonts.xxl, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle:  { fontSize: fonts.sm, color: colors.textMuted, marginBottom: 16 },
  label:     { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600', marginBottom: 8 },

  dangerBanner: {
    backgroundColor: colors.danger + '25', borderBottomWidth: 1, borderColor: colors.danger,
    padding: 12,
  },
  dangerText: { fontSize: fonts.sm, color: colors.danger, fontWeight: '700', textAlign: 'center' },

  topTabBar: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  topTab:    { flex: 1, paddingVertical: 12, alignItems: 'center' },
  topTabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  topTabText:   { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600' },
  topTabTextActive: { color: colors.primary, fontWeight: '800' },

  section: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: fonts.md, fontWeight: '700', color: colors.text, marginBottom: 10 },
  rowBetween:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  firmHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 14, marginBottom: 12, borderWidth: 1,
  },
  firmHeaderEmoji: { fontSize: 28 },
  firmHeaderName:  { fontSize: fonts.lg, fontWeight: '800', color: colors.text },
  firmHeaderPhase: { fontSize: fonts.xs, color: colors.textMuted },
  resetText: { fontSize: fonts.xs, color: colors.danger, fontWeight: '700' },

  bigPct: { fontSize: fonts.xl, fontWeight: '900' },

  progressBarBg: { backgroundColor: '#21262d', borderRadius: 6, height: 10, marginVertical: 8 },
  progressBarFill: { height: 10, borderRadius: 6 },
  barLabel:   { fontSize: fonts.xs, color: colors.textMuted },
  budgetText: { fontSize: fonts.sm, fontWeight: '700', marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statBox:  { flex: 1, backgroundColor: '#0d1117', borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  statLabel: { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600' },
  statValue: { fontSize: fonts.md, fontWeight: '800', marginTop: 3 },

  rulesCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 14, marginBottom: 12, borderWidth: 1,
  },
  rulesTitle: { fontSize: fonts.md, fontWeight: '700', marginBottom: 10 },
  ruleRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  ruleLabel:  { fontSize: fonts.sm, color: colors.textMuted },
  ruleValue:  { fontSize: fonts.sm, fontWeight: '700' },

  scanBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginBottom: 16,
  },
  scanBtnText: { fontSize: fonts.lg, fontWeight: '700', color: '#fff' },
  scanningText: { fontSize: fonts.sm, color: colors.textMuted, marginTop: 12, textAlign: 'center' },

  dailyTip: { fontSize: fonts.sm, color: colors.text, lineHeight: 26 },

  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: fonts.md, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },

  sizeCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 14, marginBottom: 12, marginTop: -4,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  sizeTitle: { fontSize: fonts.sm, fontWeight: '700', color: colors.primary, marginBottom: 10 },
  sizeRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sizeBox:   { flex: 1, backgroundColor: '#0d1117', borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  sizeLabel: { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600' },
  sizeValue: { fontSize: fonts.md, fontWeight: '800', color: colors.text, marginTop: 3 },

  logOpenBtn: {
    borderWidth: 1, borderColor: colors.primary + '60', borderRadius: radius.sm,
    paddingVertical: 8, alignItems: 'center',
  },
  logOpenText: { fontSize: fonts.sm, color: colors.primary, fontWeight: '700' },
  logForm:    { paddingTop: 10 },
  logLabel:   { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600', marginBottom: 6 },
  resultRow:  { flexDirection: 'row', gap: 8, marginBottom: 12 },
  resultChip: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm,
    backgroundColor: '#21262d', borderWidth: 1, borderColor: colors.border,
  },
  resultChipText: { fontSize: fonts.sm, fontWeight: '700', color: colors.textMuted },
  pnlInput: {
    backgroundColor: '#0a0a0f', borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, color: colors.text, fontSize: fonts.md,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  logSaveBtn: {
    backgroundColor: colors.success, borderRadius: radius.sm,
    paddingVertical: 10, alignItems: 'center',
  },
  logSaveBtnText: { fontSize: fonts.md, fontWeight: '700', color: '#fff' },

  historyCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  gradeCircle: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  gradeCircleText: { fontSize: fonts.xs, fontWeight: '900', color: '#000' },
  historyPair:  { fontSize: fonts.md, fontWeight: '700', color: colors.text },
  historyDate:  { fontSize: fonts.xs, color: colors.textMuted },
  historyPnl:   { fontSize: fonts.lg, fontWeight: '800' },
  historyDir:   { fontSize: fonts.xs, color: colors.textMuted },

  // Setup screen
  firmChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 8, borderWidth: 1, borderColor: colors.border,
  },
  firmChipEmoji: { fontSize: 16 },
  firmChipText:  { fontSize: fonts.sm, fontWeight: '700', color: colors.textMuted },
  phaseRow:  { gap: 8, marginBottom: 16 },
  phaseChip: {
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  phaseChipText: { fontSize: fonts.sm, fontWeight: '700', color: colors.textMuted },
  sizeChip:      {
    backgroundColor: colors.card, borderRadius: radius.sm,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  sizeChipActive:     { backgroundColor: colors.primary + '25', borderColor: colors.primary },
  sizeChipText:       { fontSize: fonts.sm, fontWeight: '700', color: colors.textMuted },
  sizeChipTextActive: { color: colors.primary },
  input: {
    backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, color: colors.text, fontSize: fonts.md,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
  },
  startBtn:    { borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  startBtnText: { fontSize: fonts.xl, fontWeight: '800', color: '#fff' },
});
