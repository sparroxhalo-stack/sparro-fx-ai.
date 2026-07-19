import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllSignals, PAIRS } from '../services/signals';
import {
  startBot, stopBot, isBotRunning, loadBotSettings, saveBotSettings,
  loadBotQueue, saveBotQueue, clearBotQueue, calcLots,
  DEFAULT_SETTINGS, riskGuardPassed,
} from '../services/bot';
import SignalCard from '../components/SignalCard';
import { colors, fonts, radius, gradeColor } from '../theme';

// ── Prop firm definitions ────────────────────────────────────────────────────
const FIRMS = [
  {
    name: 'FTMO', logo: '🏆', color: '#1a6cff',
    phases: [
      { label: 'Challenge (Phase 1)', profitTarget: 10, maxDaily: 5, maxTotal: 10, minDays: 4 },
      { label: 'Verification (Phase 2)', profitTarget: 5, maxDaily: 5, maxTotal: 10, minDays: 4 },
    ],
  },
  {
    name: 'Funded Next', logo: '⚡', color: '#7c3aed',
    phases: [
      { label: 'Phase 1', profitTarget: 10, maxDaily: 5, maxTotal: 10, minDays: 5 },
      { label: 'Phase 2', profitTarget: 5,  maxDaily: 5, maxTotal: 10, minDays: 5 },
    ],
  },
  {
    name: 'The Funded Trader', logo: '💼', color: '#059669',
    phases: [
      { label: 'Standard Phase 1', profitTarget: 10, maxDaily: 6, maxTotal: 12, minDays: 5 },
      { label: 'Standard Phase 2', profitTarget: 5,  maxDaily: 6, maxTotal: 12, minDays: 5 },
    ],
  },
  {
    name: 'The5ers', logo: '🌍', color: '#d97706',
    phases: [
      { label: 'Hyper Growth', profitTarget: 8, maxDaily: 4, maxTotal: 5, minDays: 0 },
    ],
  },
  {
    name: 'My Forex Funds', logo: '📊', color: '#0891b2',
    phases: [
      { label: 'Rapid (1-Phase)', profitTarget: 8, maxDaily: 5, maxTotal: 12, minDays: 5 },
      { label: 'Evaluation Phase 1', profitTarget: 8, maxDaily: 5, maxTotal: 12, minDays: 5 },
    ],
  },
  {
    name: 'Funded Engineer', logo: '🔧', color: '#e11d48',
    phases: [
      { label: 'Phase 1', profitTarget: 8, maxDaily: 5, maxTotal: 8, minDays: 5 },
      { label: 'Phase 2', profitTarget: 5, maxDaily: 5, maxTotal: 8, minDays: 5 },
    ],
  },
];

const ACCOUNT_SIZES = ['5,000', '10,000', '25,000', '50,000', '100,000', '200,000'];
const STORAGE_KEY   = 'propFirmChallenge';

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function PropFirmScreen() {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      setChallenge(raw ? JSON.parse(raw) : null);
      setLoading(false);
    });
  }, []);

  const saveChallenge = async (data) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setChallenge(data);
  };

  const resetChallenge = () => {
    Alert.alert('Reset Challenge', 'Clear all progress and stop the bot?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        stopBot();
        await AsyncStorage.removeItem(STORAGE_KEY);
        await clearBotQueue();
        setChallenge(null);
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {challenge
        ? <ChallengeTracker challenge={challenge} onSave={saveChallenge} onReset={resetChallenge} />
        : <SetupScreen onStart={saveChallenge} />
      }
    </View>
  );
}

// ── Setup screen ─────────────────────────────────────────────────────────────
function SetupScreen({ onStart }) {
  const [firmIdx,   setFirmIdx]   = useState(0);
  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [size,      setSize]      = useState('10,000');
  const [customSize,setCustomSize] = useState('');

  const firm  = FIRMS[firmIdx];
  const phase = firm.phases[phaseIdx];
  const accountSize = parseFloat((customSize || size).replace(/,/g, ''));

  const start = () => {
    if (!accountSize || isNaN(accountSize))
      return Alert.alert('Account size required', 'Enter your account balance.');
    const today = new Date().toLocaleDateString();
    onStart({
      firmIdx, phaseIdx, accountSize,
      startBalance: accountSize, currentBalance: accountSize,
      dailyStartBalance: accountSize, dailyLossUsed: 0, totalLossUsed: 0,
      profitEarned: 0, daysTraded: 0, tradesLogged: [],
      lastTradingDay: today, startDate: today,
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🏦 Start Your Challenge</Text>
      <Text style={styles.subtitle}>The bot will use SMC strategy to find trades for you</Text>

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

      <Text style={styles.label}>Challenge Phase</Text>
      <View style={{ marginBottom: 16 }}>
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

      {/* Rules */}
      <View style={[styles.rulesCard, { borderColor: firm.color + '50' }]}>
        <Text style={[styles.rulesTitle, { color: firm.color }]}>{firm.logo} {firm.name} — {phase.label}</Text>
        <RuleRow label="🎯 Profit Target"    value={`${phase.profitTarget}%  ($${((accountSize || 10000) * phase.profitTarget / 100).toLocaleString()})`} color={colors.success} />
        <RuleRow label="📉 Max Daily Loss"   value={`${phase.maxDaily}%  ($${((accountSize || 10000) * phase.maxDaily / 100).toLocaleString()})`}       color={colors.danger}  />
        <RuleRow label="🔻 Max Total Loss"   value={`${phase.maxTotal}%  ($${((accountSize || 10000) * phase.maxTotal / 100).toLocaleString()})`}        color={colors.danger}  />
        <RuleRow label="📅 Min Trading Days" value={phase.minDays > 0 ? `${phase.minDays} days` : 'No minimum'}                                          color={colors.text}    />
      </View>

      <Text style={styles.label}>Account Size ($)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {ACCOUNT_SIZES.map((s) => (
          <TouchableOpacity
            key={s}
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

// ── Challenge tracker (4 tabs) ────────────────────────────────────────────────
function ChallengeTracker({ challenge, onSave, onReset }) {
  const firm  = FIRMS[challenge.firmIdx];
  const phase = firm.phases[challenge.phaseIdx];
  const [tab, setTab] = useState('dashboard');

  // Check new day on mount
  useEffect(() => {
    const today = new Date().toLocaleDateString();
    if (challenge.lastTradingDay !== today) {
      onSave({ ...challenge, dailyLossUsed: 0, dailyStartBalance: challenge.currentBalance, lastTradingDay: today });
    }
  }, []);

  const accountSize  = challenge.accountSize;
  const profitPct    = (challenge.currentBalance - challenge.startBalance) / challenge.startBalance * 100;
  const dailyLossPct = challenge.dailyLossUsed / accountSize * 100;
  const totalLossPct = challenge.totalLossUsed  / accountSize * 100;
  const targetPct    = phase.profitTarget;
  const progressPct  = Math.min(100, (profitPct / targetPct) * 100);
  const dailyLeft    = accountSize * phase.maxDaily  / 100 - challenge.dailyLossUsed;
  const totalLeft    = accountSize * phase.maxTotal  / 100 - challenge.totalLossUsed;
  const targetLeft   = accountSize * targetPct       / 100 - challenge.profitEarned;
  const dangerLevel  = dailyLossPct >= 70 || totalLossPct >= 60;

  const logTrade = (sig, result, pnlAmount) => {
    const pnl = parseFloat(pnlAmount);
    if (isNaN(pnl)) return;
    const today = new Date().toLocaleDateString();
    const newBalance   = challenge.currentBalance + pnl;
    const profitEarned = Math.max(0, challenge.profitEarned + pnl);
    const dailyLoss    = pnl < 0 ? challenge.dailyLossUsed + Math.abs(pnl) : challenge.dailyLossUsed;
    const totalLoss    = pnl < 0 ? challenge.totalLossUsed  + Math.abs(pnl) : challenge.totalLossUsed;

    if (dailyLoss > accountSize * phase.maxDaily / 100)
      Alert.alert('⛔ Daily Loss Limit Breached!', 'Stop trading today immediately.');
    else if (totalLoss > accountSize * phase.maxTotal / 100)
      Alert.alert('⛔ Max Drawdown Breached!', 'Your challenge may be failed.');
    else if (profitEarned >= accountSize * targetPct / 100)
      Alert.alert('🎉 Profit Target Hit!', `You've reached ${targetPct}%! Check minimum trading days.`);

    onSave({
      ...challenge,
      currentBalance: newBalance, profitEarned,
      dailyLossUsed: dailyLoss, totalLossUsed: totalLoss,
      daysTraded: challenge.lastTradingDay !== today ? challenge.daysTraded + 1 : challenge.daysTraded,
      lastTradingDay: today,
      tradesLogged: [
        { id: Date.now(), pair: sig?.pair || '—', direction: sig?.direction || '—',
          setupType: sig?.setupType || '—', grade: sig?.grade || '—',
          result, pnl, date: today, balance: newBalance },
        ...challenge.tradesLogged,
      ],
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {dangerLevel && (
        <View style={styles.dangerBanner}>
          <Text style={styles.dangerText}>⛔ WARNING — Near drawdown limit. Bot has been paused. Stop trading now.</Text>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.topTabBar}>
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'bot',       label: '🤖 Bot'       },
          { id: 'trades',    label: '⚡ Trades'     },
          { id: 'history',   label: '📋 History'   },
        ].map(t => (
          <TouchableOpacity key={t.id} style={[styles.topTab, tab === t.id && styles.topTabActive]} onPress={() => setTab(t.id)}>
            <Text style={[styles.topTabText, tab === t.id && styles.topTabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ══ DASHBOARD ══ */}
        {tab === 'dashboard' && (
          <>
            <View style={[styles.firmHeader, { borderColor: firm.color + '50' }]}>
              <Text style={styles.firmHeaderEmoji}>{firm.logo}</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.firmHeaderName}>{firm.name}</Text>
                <Text style={styles.firmHeaderPhase}>{phase.label}</Text>
              </View>
              <TouchableOpacity onPress={onReset}><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
            </View>

            {/* Progress */}
            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>🎯 Challenge Progress</Text>
                <Text style={[styles.bigPct, { color: profitPct >= 0 ? colors.success : colors.danger }]}>
                  {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                </Text>
              </View>
              <Bar value={progressPct} color={firm.color} />
              <View style={styles.rowBetween}>
                <Text style={styles.barLabel}>0%</Text>
                <Text style={styles.barLabel}>Target {targetPct}%</Text>
              </View>
              <View style={styles.statsRow}>
                <StatBox label="Balance"    value={`$${challenge.currentBalance.toLocaleString(undefined,{maximumFractionDigits:0})}`} color={colors.text} />
                <StatBox label="P&L"        value={`${profitPct>=0?'+':''}$${(challenge.currentBalance-challenge.startBalance).toFixed(0)}`} color={profitPct>=0?colors.success:colors.danger} />
                <StatBox label="Need"       value={`$${Math.max(0,targetLeft).toFixed(0)}`}                    color={colors.warning} />
              </View>
            </View>

            {/* Daily loss */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📉 Daily Loss Used</Text>
              <Bar value={Math.min(100, dailyLossPct)} color={barColor(dailyLossPct)} />
              <View style={styles.rowBetween}>
                <Text style={styles.barLabel}>${challenge.dailyLossUsed.toFixed(0)} used  ·  {dailyLossPct.toFixed(1)}%</Text>
                <Text style={[styles.barLabel, { color: dailyLeft < 200 ? colors.danger : colors.success }]}>
                  ${Math.max(0, dailyLeft).toFixed(0)} left
                </Text>
              </View>
            </View>

            {/* Total drawdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔻 Total Drawdown Used</Text>
              <Bar value={Math.min(100, totalLossPct)} color={barColor(totalLossPct)} />
              <View style={styles.rowBetween}>
                <Text style={styles.barLabel}>${challenge.totalLossUsed.toFixed(0)} used  ·  {totalLossPct.toFixed(1)}%</Text>
                <Text style={[styles.barLabel, { color: totalLeft < 500 ? colors.danger : colors.success }]}>
                  ${Math.max(0, totalLeft).toFixed(0)} left
                </Text>
              </View>
            </View>

            {/* Days */}
            {phase.minDays > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📅 Trading Days</Text>
                <Bar value={Math.min(100, (challenge.daysTraded / phase.minDays) * 100)} color={colors.primary} />
                <View style={styles.rowBetween}>
                  <Text style={styles.barLabel}>{challenge.daysTraded} days traded</Text>
                  <Text style={styles.barLabel}>Minimum: {phase.minDays}</Text>
                </View>
              </View>
            )}

            {/* Rules */}
            <View style={[styles.rulesCard, { borderColor: firm.color + '40' }]}>
              <Text style={[styles.rulesTitle, { color: firm.color }]}>⚠️ Challenge Rules</Text>
              <RuleRow label="Max daily loss"   value={`${phase.maxDaily}%  ($${(accountSize * phase.maxDaily / 100).toLocaleString()})`}    color={colors.danger}  />
              <RuleRow label="Max total loss"   value={`${phase.maxTotal}%  ($${(accountSize * phase.maxTotal / 100).toLocaleString()})`}     color={colors.danger}  />
              <RuleRow label="Profit target"    value={`${phase.profitTarget}%  ($${(accountSize * phase.profitTarget / 100).toLocaleString()})`} color={colors.success} />
              <RuleRow label="Min trading days" value={phase.minDays > 0 ? `${phase.minDays} days` : 'No minimum'}                           color={colors.text}    />
            </View>

            {/* Daily tips */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Today's Rules</Text>
              {[
                dailyLeft < accountSize * 0.02 ? '🛑 Stop — daily loss limit almost hit' : `✅ Daily buffer: $${dailyLeft.toFixed(0)} remaining`,
                `🎯 Max risk per trade: $${(accountSize * 0.01).toFixed(0)}  (1%)`,
                '📐 Bot uses SMC: Order Blocks + Fair Value Gaps + BOS',
                '⏰ Best sessions: London 08–12 UTC · New York 13–17 UTC',
                '🔒 Bot only queues Grade A setups — you execute on MT5',
              ].map((tip, i) => <Text key={i} style={styles.dailyTip}>{tip}</Text>)}
            </View>
          </>
        )}

        {/* ══ BOT ══ */}
        {tab === 'bot' && (
          <BotTab challenge={challenge} phase={phase} onSave={onSave} dangerLevel={dangerLevel} />
        )}

        {/* ══ TRADES (manual scan) ══ */}
        {tab === 'trades' && (
          <TradesTab challenge={challenge} phase={phase} onLog={logTrade} />
        )}

        {/* ══ HISTORY ══ */}
        {tab === 'history' && (
          <>
            <Text style={styles.title}>📋 Trade History</Text>
            {challenge.tradesLogged.length === 0 ? (
              <Empty icon="📋" text="No trades logged yet." />
            ) : challenge.tradesLogged.map((t, i) => (
              <View key={t.id || i} style={styles.historyCard}>
                <View style={styles.rowBetween}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.gradeCircle, { backgroundColor: gradeColor(t.grade) }]}>
                      <Text style={styles.gradeCircleText}>{t.grade}</Text>
                    </View>
                    <View>
                      <Text style={styles.historyPair}>{t.pair}</Text>
                      <Text style={styles.historyDate}>{t.setupType}  ·  {t.date}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.historyPnl, { color: t.pnl >= 0 ? colors.success : colors.danger }]}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(0)}
                    </Text>
                    <Text style={[styles.historyDir, { color: t.direction === 'BUY' ? colors.success : colors.danger }]}>
                      {t.direction}  ·  {t.result}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ── Bot Tab ───────────────────────────────────────────────────────────────────
function BotTab({ challenge, phase, onSave, dangerLevel }) {
  const [settings,   setSettings]   = useState({ ...DEFAULT_SETTINGS });
  const [botRunning, setBotRunning] = useState(false);
  const [queue,      setQueue]      = useState([]);
  const [lastScan,   setLastScan]   = useState(null);
  const [nextScanIn, setNextScanIn] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const nextRef = useRef(null);

  useEffect(() => {
    loadBotSettings().then(s => setSettings(s));
    loadBotQueue().then(q => setQueue(q));
    setBotRunning(isBotRunning());
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!botRunning || !lastScan) return;
    const tick = () => {
      const elapsed = (Date.now() - lastScan.getTime()) / 1000;
      const remaining = Math.max(0, settings.intervalMins * 60 - elapsed);
      setNextScanIn(Math.round(remaining));
    };
    tick();
    nextRef.current = setInterval(tick, 1000);
    return () => clearInterval(nextRef.current);
  }, [botRunning, lastScan, settings.intervalMins]);

  const guardPassed = riskGuardPassed(
    challenge, phase, settings,
    queue.filter(q => q.date === new Date().toLocaleDateString()).length
  );

  const toggleBot = async () => {
    if (botRunning) {
      stopBot();
      setBotRunning(false);
      setNextScanIn(null);
    } else {
      if (dangerLevel) {
        Alert.alert('⛔ Risk Limit Near', 'Bot cannot start when you are near the drawdown limit.');
        return;
      }
      if (!guardPassed) {
        Alert.alert('⛔ Risk Guard', 'Daily trade quota or drawdown buffer reached. Bot blocked.');
        return;
      }
      await saveBotSettings(settings);
      startBot({
        settings,
        challenge,
        phase,
        onSignal: async (sig) => {
          const q = await loadBotQueue();
          setQueue([...q]);
          Alert.alert(
            `🤖 Bot Signal — ${sig.pair}`,
            `${sig.direction} · Grade ${sig.grade} · ${sig.setupType}\nEntry: ${sig.entry}  SL: ${sig.sl}  TP1: ${sig.tp1}\nLots: ${sig.lots} · Risk: $${sig.riskAmount}`,
            [{ text: 'View Queue', onPress: () => {} }]
          );
        },
        onScan: (ts) => {
          setLastScan(ts);
        },
      });
      setBotRunning(true);
    }
  };

  const markStatus = async (id, status) => {
    const updated = queue.map(q => q.id === id ? { ...q, status } : q);
    setQueue(updated);
    await saveBotQueue(updated);
  };

  const pendingQueue = queue.filter(q => q.status === 'pending');
  const doneQueue    = queue.filter(q => q.status !== 'pending');

  return (
    <>
      {/* Bot header */}
      <View style={[styles.botHeader, { borderColor: botRunning ? colors.success + '50' : colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.botTitle}>🤖 Challenge Bot</Text>
          <Text style={styles.botSubtitle}>SMC strategy · Auto-scan · Grade A only</Text>
          {botRunning && lastScan && (
            <Text style={styles.botStatus}>
              Last scan: {lastScan.toLocaleTimeString()}
              {nextScanIn != null ? `  ·  Next in ${Math.floor(nextScanIn / 60)}m ${nextScanIn % 60}s` : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: botRunning ? colors.danger : colors.success }]} onPress={toggleBot}>
          <Text style={styles.toggleBtnText}>{botRunning ? '⏹ Stop' : '▶ Start'}</Text>
        </TouchableOpacity>
      </View>

      {/* Risk guard status */}
      <View style={[styles.guardCard, { backgroundColor: guardPassed ? colors.success + '10' : colors.danger + '10', borderColor: guardPassed ? colors.success + '30' : colors.danger + '30' }]}>
        <Text style={{ fontSize: fonts.xs, color: guardPassed ? colors.success : colors.danger, fontWeight: '700' }}>
          {guardPassed
            ? `✅ Risk guard clear — daily budget: $${(challenge.accountSize * phase.maxDaily / 100 - challenge.dailyLossUsed).toFixed(0)} remaining`
            : '⛔ Risk guard active — daily quota or drawdown buffer reached'}
        </Text>
      </View>

      {/* Settings toggle */}
      <TouchableOpacity style={styles.settingsToggle} onPress={() => setShowSettings(v => !v)}>
        <Text style={styles.settingsToggleText}>⚙️ Bot Settings  {showSettings ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showSettings && (
        <BotSettings
          settings={settings}
          onChange={async (s) => { setSettings(s); await saveBotSettings(s); }}
          accountSize={challenge.accountSize}
        />
      )}

      {/* Signal queue */}
      <Text style={styles.queueTitle}>📥 Signal Queue  ({pendingQueue.length} pending)</Text>

      {pendingQueue.length === 0 && (
        <View style={[styles.emptyBox, { marginBottom: 12 }]}>
          <Text style={styles.emptyIcon}>🤖</Text>
          <Text style={styles.emptyText}>
            {botRunning
              ? 'Bot is scanning…\nSignals appear here when found.'
              : 'Start the bot to receive SMC signals automatically.'}
          </Text>
        </View>
      )}

      {pendingQueue.map(sig => (
        <BotSignalCard key={sig.id} sig={sig} onExecuted={() => markStatus(sig.id, 'executed')} onSkip={() => markStatus(sig.id, 'skipped')} />
      ))}

      {doneQueue.length > 0 && (
        <>
          <Text style={[styles.queueTitle, { marginTop: 16 }]}>✅ Completed ({doneQueue.length})</Text>
          {doneQueue.slice(0, 5).map(sig => (
            <View key={sig.id} style={styles.doneCard}>
              <Text style={styles.donePair}>{sig.pair}  ·  {sig.direction}  ·  {sig.setupType}</Text>
              <Text style={[styles.doneStatus, { color: sig.status === 'executed' ? colors.success : colors.textMuted }]}>
                {sig.status === 'executed' ? '✅ Executed' : '⏭ Skipped'}  ·  {sig.date}
              </Text>
            </View>
          ))}
        </>
      )}
    </>
  );
}

// ── Bot settings panel ───────────────────────────────────────────────────────
function BotSettings({ settings, onChange, accountSize }) {
  const set = (key, val) => onChange({ ...settings, [key]: val });

  return (
    <View style={styles.settingsCard}>
      <SettingRow label="Scan Interval">
        {[15, 30, 60].map(m => (
          <Chip key={m} active={settings.intervalMins === m} onPress={() => set('intervalMins', m)} label={`${m}m`} />
        ))}
      </SettingRow>

      <SettingRow label="Max Trades / Day">
        {[1, 2, 3, 4].map(n => (
          <Chip key={n} active={settings.maxDailyTrades === n} onPress={() => set('maxDailyTrades', n)} label={`${n}`} />
        ))}
      </SettingRow>

      <SettingRow label="Risk Per Trade">
        {[0.5, 1, 1.5].map(r => (
          <Chip key={r} active={settings.riskPct === r} onPress={() => set('riskPct', r)}
            label={`${r}% ($${(accountSize * r / 100).toFixed(0)})`} />
        ))}
      </SettingRow>

      <SettingRow label="Min Signal Grade">
        <Chip active={settings.minGrade === 'A'} onPress={() => set('minGrade', 'A')} label="A only" />
        <Chip active={settings.minGrade === 'B'} onPress={() => set('minGrade', 'B')} label="A or B" />
      </SettingRow>

      <SettingRow label="Trading Sessions">
        {['London', 'NY', 'LondonNY', 'All'].map(s => (
          <Chip key={s} active={settings.sessions === s} onPress={() => set('sessions', s)}
            label={s === 'LondonNY' ? 'Both' : s} />
        ))}
      </SettingRow>
    </View>
  );
}

// ── Bot signal card ──────────────────────────────────────────────────────────
function BotSignalCard({ sig, onExecuted, onSkip }) {
  const gc = gradeColor(sig.grade);
  const dec = sig.pair === 'XAUUSD' ? 2 : sig.pair.includes('JPY') ? 3 : 5;

  return (
    <View style={[styles.botSigCard, { borderColor: gc + '60' }]}>
      {/* Header */}
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.gradeCircle, { backgroundColor: gc }]}>
            <Text style={styles.gradeCircleText}>{sig.grade}</Text>
          </View>
          <View>
            <Text style={styles.historyPair}>{sig.pair}</Text>
            <Text style={[styles.historyDate, { color: sig.direction === 'BUY' ? colors.success : colors.danger }]}>
              {sig.direction}  ·  {sig.setupType}  ·  {sig.confidence}%
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.botLots}>{sig.lots} lots</Text>
          <Text style={[styles.botRisk, { color: colors.danger }]}>Risk $-{sig.riskAmount}</Text>
        </View>
      </View>

      {/* MT5 parameters */}
      <View style={styles.mt5Box}>
        <Text style={styles.mt5Title}>📋 MT5 Order Parameters</Text>
        <View style={styles.mt5Grid}>
          <MT5Param label="Direction" value={sig.direction} color={sig.direction === 'BUY' ? colors.success : colors.danger} />
          <MT5Param label="Entry"     value={sig.entry?.toFixed(dec)} color={colors.text} />
          <MT5Param label="Lot Size"  value={sig.lots} color={colors.primary} />
          <MT5Param label="SL"        value={sig.sl?.toFixed(dec)} color={colors.danger} />
          <MT5Param label="TP 1"      value={sig.tp1?.toFixed(dec)} color={colors.success} />
          <MT5Param label="TP 2"      value={sig.tp2?.toFixed(dec)} color={colors.success} />
        </View>
        {sig.tp3 && (
          <Text style={styles.tp3Line}>TP3 (full target): {sig.tp3?.toFixed(dec)}</Text>
        )}
      </View>

      {/* SMC reason */}
      {sig.reason ? (
        <Text style={styles.sigReason}>💡 {sig.reason}</Text>
      ) : null}

      {/* News warning */}
      {sig.newsWarning ? (
        <Text style={styles.newsWarn}>⚠️ {sig.newsWarning}</Text>
      ) : null}

      {/* Actions */}
      <View style={styles.sigActions}>
        <TouchableOpacity style={styles.execBtn} onPress={onExecuted}>
          <Text style={styles.execBtnText}>✅ Executed on MT5</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
          <Text style={styles.skipBtnText}>⏭ Skip</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.queuedAt}>Queued {new Date(sig.queuedAt).toLocaleTimeString()}</Text>
    </View>
  );
}

// ── Trades tab (manual scan) ─────────────────────────────────────────────────
function TradesTab({ challenge, phase, onLog }) {
  const [signals,  setSignals]  = useState([]);
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanning(true);
    const all  = await fetchAllSignals(PAIRS);
    const safe = all.filter(s => ['A', 'B'].includes(s.grade));
    setSignals(safe);
    setScanning(false);
  };

  return (
    <>
      <Text style={styles.title}>⚡ Manual Scan</Text>
      <Text style={styles.subtitle}>Grade A & B SMC setups only</Text>

      <TouchableOpacity style={styles.scanBtn} onPress={scan} disabled={scanning}>
        {scanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanBtnText}>🔍 Scan All Pairs Now</Text>}
      </TouchableOpacity>

      {scanning && <Text style={styles.scanningText}>Fetching live prices + SMC analysis on all pairs…</Text>}

      {!scanning && signals.length === 0 && <Empty icon="⚡" text="Tap Scan to get SMC signals calibrated to your challenge." />}

      {signals.map((sig, i) => {
        const lots = calcLots(challenge.accountSize, 1, sig.entry, sig.sl, sig.pair);
        return (
          <View key={i}>
            <SignalCard signal={sig} />
            <View style={styles.sizeCard}>
              <Text style={styles.sizeTitle}>📐 Position Size (1% risk)</Text>
              <View style={styles.sizeRow}>
                <SizeBox label="Lot Size"     value={lots} />
                <SizeBox label="Risk"         value={`$${(challenge.accountSize * 0.01).toFixed(0)}`} color={colors.danger} />
                <SizeBox label="Setup"        value={sig.setupType ?? '—'} color={colors.primary} />
              </View>
              <LogTradeRow signal={sig} onLog={onLog} />
            </View>
          </View>
        );
      })}
    </>
  );
}

// ── Log trade row ─────────────────────────────────────────────────────────────
function LogTradeRow({ signal, onLog }) {
  const [pnl, setPnl]       = useState('');
  const [result, setResult] = useState('Win');
  const [show, setShow]     = useState(false);

  if (!show) return (
    <TouchableOpacity style={styles.logOpenBtn} onPress={() => setShow(true)}>
      <Text style={styles.logOpenText}>+ Log This Trade</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.logForm}>
      <Text style={styles.logLabel}>Result</Text>
      <View style={styles.resultRow}>
        {['Win', 'Loss', 'Breakeven'].map(r => {
          const c = r === 'Win' ? colors.success : r === 'Loss' ? colors.danger : colors.warning;
          return (
            <TouchableOpacity key={r} style={[styles.resultChip, result === r && { backgroundColor: c + '30', borderColor: c }]} onPress={() => setResult(r)}>
              <Text style={[styles.resultChipText, result === r && { color: c }]}>{r}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.logLabel}>P&L ($) — negative for loss e.g. -150</Text>
      <TextInput style={styles.pnlInput} value={pnl} onChangeText={setPnl} keyboardType="numbers-and-punctuation" placeholder="+200 or -150" placeholderTextColor={colors.textMuted} />
      <TouchableOpacity style={styles.logSaveBtn} onPress={() => { onLog(signal, result, pnl); setPnl(''); setShow(false); }}>
        <Text style={styles.logSaveBtnText}>✅ Save Trade</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Tiny helpers ─────────────────────────────────────────────────────────────
function Bar({ value, color }) {
  return (
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: `${Math.max(0, value)}%`, backgroundColor: color }]} />
    </View>
  );
}
function barColor(pct) {
  return pct >= 70 ? colors.danger : pct >= 40 ? colors.warning : colors.success;
}
function StatBox({ label, value, color }) {
  return <View style={styles.statBox}><Text style={styles.statLabel}>{label}</Text><Text style={[styles.statValue, { color }]}>{value}</Text></View>;
}
function SizeBox({ label, value, color }) {
  return <View style={styles.sizeBox}><Text style={styles.sizeLabel}>{label}</Text><Text style={[styles.sizeValue, { color: color ?? colors.text }]}>{value}</Text></View>;
}
function RuleRow({ label, value, color }) {
  return <View style={styles.ruleRow}><Text style={styles.ruleLabel}>{label}</Text><Text style={[styles.ruleValue, { color }]}>{value}</Text></View>;
}
function Empty({ icon, text }) {
  return <View style={styles.emptyBox}><Text style={styles.emptyIcon}>{icon}</Text><Text style={styles.emptyText}>{text}</Text></View>;
}
function Chip({ active, onPress, label }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
function SettingRow({ label, children }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingChips}>{children}</View>
    </View>
  );
}
function MT5Param({ label, value, color }) {
  return (
    <View style={styles.mt5Param}>
      <Text style={styles.mt5Label}>{label}</Text>
      <Text style={[styles.mt5Value, { color }]}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg, padding: 12 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: fonts.xxl, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle:    { fontSize: fonts.sm, color: colors.textMuted, marginBottom: 16 },
  label:       { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600', marginBottom: 8 },

  dangerBanner: { backgroundColor: colors.danger + '25', borderBottomWidth: 1, borderColor: colors.danger, padding: 12 },
  dangerText:   { fontSize: fonts.sm, color: colors.danger, fontWeight: '700', textAlign: 'center' },

  topTabBar:       { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  topTab:          { flex: 1, paddingVertical: 11, alignItems: 'center' },
  topTabActive:    { borderBottomWidth: 2, borderBottomColor: colors.primary },
  topTabText:      { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  topTabTextActive:{ color: colors.primary, fontWeight: '800' },

  section:      { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: fonts.md, fontWeight: '700', color: colors.text, marginBottom: 10 },
  rowBetween:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  firmHeader:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1 },
  firmHeaderEmoji:{ fontSize: 28 },
  firmHeaderName: { fontSize: fonts.lg, fontWeight: '800', color: colors.text },
  firmHeaderPhase:{ fontSize: fonts.xs, color: colors.textMuted },
  resetText:      { fontSize: fonts.xs, color: colors.danger, fontWeight: '700' },
  bigPct:         { fontSize: fonts.xl, fontWeight: '900' },

  progressBarBg:   { backgroundColor: '#21262d', borderRadius: 6, height: 10, marginVertical: 8 },
  progressBarFill: { height: 10, borderRadius: 6 },
  barLabel:        { fontSize: fonts.xs, color: colors.textMuted },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statBox:  { flex: 1, backgroundColor: '#0d1117', borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  statLabel:{ fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600' },
  statValue:{ fontSize: fonts.md, fontWeight: '800', marginTop: 3 },

  rulesCard:  { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1 },
  rulesTitle: { fontSize: fonts.md, fontWeight: '700', marginBottom: 10 },
  ruleRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  ruleLabel:  { fontSize: fonts.sm, color: colors.textMuted },
  ruleValue:  { fontSize: fonts.sm, fontWeight: '700' },
  dailyTip:   { fontSize: fonts.sm, color: colors.text, lineHeight: 26 },

  // Bot
  botHeader:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 10, borderWidth: 1 },
  botTitle:    { fontSize: fonts.lg, fontWeight: '800', color: colors.text },
  botSubtitle: { fontSize: fonts.xs, color: colors.textMuted },
  botStatus:   { fontSize: fonts.xs, color: colors.primary, marginTop: 4 },
  toggleBtn:   { borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  toggleBtnText: { fontSize: fonts.sm, fontWeight: '800', color: '#fff' },

  guardCard:   { borderRadius: radius.md, borderWidth: 1, padding: 10, marginBottom: 10 },
  settingsToggle: { paddingVertical: 10, marginBottom: 8 },
  settingsToggleText: { fontSize: fonts.sm, color: colors.primary, fontWeight: '700' },

  settingsCard:  { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  settingRow:    { marginBottom: 12 },
  settingLabel:  { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600', marginBottom: 6 },
  settingChips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:          { backgroundColor: '#21262d', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  chipActive:    { backgroundColor: colors.primary + '25', borderColor: colors.primary },
  chipText:      { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600' },
  chipTextActive:{ color: colors.primary },

  queueTitle: { fontSize: fonts.md, fontWeight: '700', color: colors.text, marginBottom: 10 },

  botSigCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1.5 },
  botLots:    { fontSize: fonts.md, fontWeight: '800', color: colors.primary },
  botRisk:    { fontSize: fonts.xs, fontWeight: '700' },

  mt5Box:   { backgroundColor: '#0d1117', borderRadius: radius.md, padding: 12, marginVertical: 10 },
  mt5Title: { fontSize: fonts.xs, color: colors.primary, fontWeight: '700', marginBottom: 8 },
  mt5Grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mt5Param: { width: '30%', backgroundColor: '#161b22', borderRadius: radius.sm, padding: 8, alignItems: 'center' },
  mt5Label: { fontSize: 9, color: colors.textMuted, fontWeight: '600', marginBottom: 2 },
  mt5Value: { fontSize: fonts.sm, fontWeight: '800' },
  tp3Line:  { fontSize: fonts.xs, color: colors.success, marginTop: 6, fontWeight: '600' },

  sigReason:   { fontSize: fonts.xs, color: colors.textMuted, lineHeight: 18, marginBottom: 8 },
  newsWarn:    { fontSize: fonts.xs, color: colors.warning, fontWeight: '600', marginBottom: 8 },

  sigActions: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  execBtn:    { flex: 2, backgroundColor: colors.success, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  execBtnText:{ fontSize: fonts.sm, fontWeight: '700', color: '#fff' },
  skipBtn:    { flex: 1, backgroundColor: '#21262d', borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  skipBtnText:{ fontSize: fonts.sm, color: colors.textMuted, fontWeight: '700' },
  queuedAt:   { fontSize: 10, color: colors.textMuted, textAlign: 'right' },

  doneCard:   { backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  donePair:   { fontSize: fonts.sm, fontWeight: '700', color: colors.text },
  doneStatus: { fontSize: fonts.xs, marginTop: 3 },

  emptyBox:  { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: fonts.md, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },

  // Scan / size
  scanBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  scanBtnText: { fontSize: fonts.lg, fontWeight: '700', color: '#fff' },
  scanningText:{ fontSize: fonts.xs, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },

  sizeCard:  { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, marginTop: -4, borderWidth: 1, borderColor: colors.primary + '40' },
  sizeTitle: { fontSize: fonts.sm, fontWeight: '700', color: colors.primary, marginBottom: 10 },
  sizeRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sizeBox:   { flex: 1, backgroundColor: '#0d1117', borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  sizeLabel: { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600' },
  sizeValue: { fontSize: fonts.md, fontWeight: '800', marginTop: 3 },

  logOpenBtn:  { borderWidth: 1, borderColor: colors.primary + '60', borderRadius: radius.sm, paddingVertical: 8, alignItems: 'center' },
  logOpenText: { fontSize: fonts.sm, color: colors.primary, fontWeight: '700' },
  logForm:     { paddingTop: 10 },
  logLabel:    { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600', marginBottom: 6 },
  resultRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  resultChip:  { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm, backgroundColor: '#21262d', borderWidth: 1, borderColor: colors.border },
  resultChipText: { fontSize: fonts.sm, fontWeight: '700', color: colors.textMuted },
  pnlInput:    { backgroundColor: '#0a0a0f', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: fonts.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  logSaveBtn:  { backgroundColor: colors.success, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  logSaveBtnText: { fontSize: fonts.md, fontWeight: '700', color: '#fff' },

  historyCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  gradeCircle: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  gradeCircleText: { fontSize: fonts.xs, fontWeight: '900', color: '#000' },
  historyPair: { fontSize: fonts.md, fontWeight: '700', color: colors.text },
  historyDate: { fontSize: fonts.xs, color: colors.textMuted },
  historyPnl:  { fontSize: fonts.lg, fontWeight: '800' },
  historyDir:  { fontSize: fonts.xs, color: colors.textMuted },

  // Setup
  firmChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  firmChipEmoji: { fontSize: 16 },
  firmChipText:  { fontSize: fonts.sm, fontWeight: '700', color: colors.textMuted },
  phaseChip:     { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  phaseChipText: { fontSize: fonts.sm, fontWeight: '700', color: colors.textMuted },
  sizeChip:      { backgroundColor: colors.card, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  sizeChipActive: { backgroundColor: colors.primary + '25', borderColor: colors.primary },
  sizeChipText:   { fontSize: fonts.sm, fontWeight: '700', color: colors.textMuted },
  sizeChipTextActive: { color: colors.primary },
  input:   { backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: fonts.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 },
  startBtn:    { borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  startBtnText:{ fontSize: fonts.xl, fontWeight: '800', color: '#fff' },
});
