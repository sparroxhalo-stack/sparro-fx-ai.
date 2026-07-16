import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../services/AuthContext';
import { PAIRS } from '../services/signals';
import { colors, fonts, radius, gradeColor } from '../theme';

const RESULTS = ['Open', 'Win', 'Loss', 'Breakeven'];

const EMPTY_TRADE = {
  id: null, pair: 'EURUSD', direction: 'BUY',
  grade: 'A', result: 'Open',
  entry: '', sl: '', tp1: '', notes: '',
  date: new Date().toLocaleDateString(),
};

export default function JournalScreen() {
  const { isPremium } = useAuth();
  const [trades, setTrades]     = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ ...EMPTY_TRADE });

  useEffect(() => { loadTrades(); }, []);

  const loadTrades = async () => {
    try {
      const raw = await AsyncStorage.getItem('journal');
      setTrades(raw ? JSON.parse(raw) : []);
    } catch {}
  };

  const saveTrades = async (updated) => {
    await AsyncStorage.setItem('journal', JSON.stringify(updated));
    setTrades(updated);
  };

  const openNew = () => {
    setForm({ ...EMPTY_TRADE, id: Date.now(), date: new Date().toLocaleDateString() });
    setModal(true);
  };

  const openEdit = (trade) => {
    setForm({ ...trade });
    setModal(true);
  };

  const saveEntry = async () => {
    if (!form.entry) { Alert.alert('Missing', 'Please enter an entry price.'); return; }
    const updated = trades.find(t => t.id === form.id)
      ? trades.map(t => t.id === form.id ? form : t)
      : [form, ...trades];
    await saveTrades(updated);
    setModal(false);
  };

  const deleteEntry = (id) => {
    Alert.alert('Delete trade?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await saveTrades(trades.filter(t => t.id !== id));
      }},
    ]);
  };

  if (!isPremium) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockIcon}>📓</Text>
        <Text style={styles.lockTitle}>Premium Only</Text>
        <Text style={styles.lockSub}>Upgrade to log and track your trades</Text>
      </View>
    );
  }

  const resultColor = (r) =>
    r === 'Win' ? colors.success : r === 'Loss' ? colors.danger :
    r === 'Breakeven' ? colors.warning : colors.textMuted;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>📓 Trade Journal</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openNew}>
            <Text style={styles.addBtnText}>+ Log Trade</Text>
          </TouchableOpacity>
        </View>

        {trades.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📓</Text>
            <Text style={styles.emptyText}>No trades logged yet{'\n'}Tap "Log Trade" to start</Text>
          </View>
        ) : (
          trades.map(t => {
            const gc = gradeColor(t.grade);
            const rc = resultColor(t.result);
            return (
              <View key={t.id} style={styles.tradeCard}>
                <View style={styles.tradeHeader}>
                  <View style={[styles.gradeBadge, { backgroundColor: gc }]}>
                    <Text style={styles.gradeBadgeText}>{t.grade}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.tradePair}>{t.pair}</Text>
                    <Text style={styles.tradeDate}>{t.date}</Text>
                  </View>
                  <Text style={[styles.tradeDir, {
                    color: t.direction === 'BUY' ? colors.success : colors.danger,
                  }]}>{t.direction}</Text>
                  <View style={[styles.resultBadge, { backgroundColor: rc + '20', borderColor: rc }]}>
                    <Text style={[styles.resultText, { color: rc }]}>{t.result}</Text>
                  </View>
                </View>
                {t.notes ? <Text style={styles.tradeNotes}>{t.notes}</Text> : null}
                <View style={styles.tradeActions}>
                  <TouchableOpacity onPress={() => openEdit(t)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteEntry(t.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{form.id && trades.find(t => t.id === form.id) ? 'Edit Trade' : 'Log Trade'}</Text>

            <Text style={styles.label}>Pair</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {PAIRS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, form.pair === p && styles.chipActive]}
                  onPress={() => setForm(f => ({ ...f, pair: p }))}
                >
                  <Text style={[styles.chipText, form.pair === p && styles.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Direction</Text>
            <View style={styles.chipRow}>
              {['BUY', 'SELL'].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, form.direction === d && styles.chipActive,
                    form.direction === d && { borderColor: d === 'BUY' ? colors.success : colors.danger, backgroundColor: (d === 'BUY' ? colors.success : colors.danger) + '20' }]}
                  onPress={() => setForm(f => ({ ...f, direction: d }))}
                >
                  <Text style={[styles.chipText, form.direction === d && { color: d === 'BUY' ? colors.success : colors.danger }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Grade</Text>
                <View style={styles.chipRow}>
                  {['A','B','C'].map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.chip, form.grade === g && { backgroundColor: gradeColor(g) + '30', borderColor: gradeColor(g) }]}
                      onPress={() => setForm(f => ({ ...f, grade: g }))}
                    >
                      <Text style={[styles.chipText, form.grade === g && { color: gradeColor(g) }]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.label}>Result</Text>
                <View style={styles.chipRow}>
                  {RESULTS.map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.chip, form.result === r && styles.chipActive]}
                      onPress={() => setForm(f => ({ ...f, result: r }))}
                    >
                      <Text style={[styles.chipText, form.result === r && styles.chipTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Entry Price</Text>
            <TextInput
              style={styles.input}
              value={form.entry}
              onChangeText={v => setForm(f => ({ ...f, entry: v }))}
              keyboardType="decimal-pad"
              placeholder="e.g. 1.08540"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              placeholder="Why did you take this trade?"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEntry}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: fonts.xxl, fontWeight: '800', color: colors.text },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: fonts.sm, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: fonts.md, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
  tradeCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  tradeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  gradeBadge: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  gradeBadgeText: { fontSize: fonts.xs, fontWeight: '800', color: '#000' },
  tradePair: { fontSize: fonts.md, fontWeight: '700', color: colors.text },
  tradeDate: { fontSize: fonts.xs, color: colors.textMuted },
  tradeDir: { fontSize: fonts.sm, fontWeight: '700', marginRight: 8 },
  resultBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  resultText: { fontSize: fonts.xs, fontWeight: '700' },
  tradeNotes: { fontSize: fonts.sm, color: colors.textMuted, marginBottom: 8 },
  tradeActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: { flex: 1, backgroundColor: '#1a1f3a', borderRadius: radius.sm, paddingVertical: 7, alignItems: 'center' },
  editBtnText: { fontSize: fonts.sm, fontWeight: '600', color: colors.primary },
  deleteBtn: { flex: 1, backgroundColor: colors.danger + '15', borderRadius: radius.sm, paddingVertical: 7, alignItems: 'center' },
  deleteBtnText: { fontSize: fonts.sm, fontWeight: '600', color: colors.danger },
  lockContainer: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockIcon: { fontSize: 56, marginBottom: 16 },
  lockTitle: { fontSize: fonts.xxl, fontWeight: '800', color: colors.text },
  lockSub: { fontSize: fonts.md, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 24, maxHeight: '90%',
  },
  modalTitle: { fontSize: fonts.xl, fontWeight: '800', color: colors.text, marginBottom: 16 },
  label: { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm,
    backgroundColor: '#21262d', borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary + '30', borderColor: colors.primary },
  chipText: { fontSize: fonts.xs, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.primary },
  formRow: { flexDirection: 'row', marginBottom: 4 },
  input: {
    backgroundColor: '#0a0a0f', borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: fonts.md,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: '#21262d', borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: fonts.md, fontWeight: '700', color: colors.textMuted },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontSize: fonts.md, fontWeight: '700', color: '#fff' },
});
