import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../services/AuthContext';
import { colors, fonts, radius } from '../theme';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState('login'); // 'login' | 'signup'

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else if (mode === 'signup')
      Alert.alert('Account created', 'Check your email to confirm your account, then log in.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <LinearGradient
            colors={['#0072ff', '#00c6ff']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Text style={styles.logoIcon}>⚡</Text>
          </LinearGradient>
          <Text style={styles.appName}>Sparro FX AI</Text>
          <Text style={styles.tagline}>Grade A/B/C Forex Signals</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <LinearGradient
              colors={['#0072ff', '#00c6ff']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>{mode === 'login' ? 'Sign In' : 'Sign Up'}</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setMode(m => m === 'login' ? 'signup' : 'login')}
          >
            <Text style={styles.toggleText}>
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },

  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoGradient: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoIcon: { fontSize: 40 },
  appName: { fontSize: fonts.xxl + 4, fontWeight: '900', color: colors.text, letterSpacing: 1 },
  tagline: { fontSize: fonts.sm, color: colors.textMuted, marginTop: 4 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: fonts.xl, fontWeight: '800', color: colors.text, marginBottom: 20 },

  input: {
    backgroundColor: '#0a0a0f',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fonts.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },

  submitBtn: { borderRadius: radius.md, overflow: 'hidden', marginTop: 4 },
  submitGradient: { paddingVertical: 14, alignItems: 'center' },
  submitText: { fontSize: fonts.lg, fontWeight: '800', color: '#fff' },

  toggleBtn: { marginTop: 16, alignItems: 'center' },
  toggleText: { fontSize: fonts.sm, color: colors.primary },
});
