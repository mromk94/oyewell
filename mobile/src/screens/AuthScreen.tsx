import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../lib/auth';
import { useNavigation, useRoute, type RouteProp, type NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, fontSizes } from '../theme';
import { Logo } from '../components/Logo';
import { forgotPassword, resetPassword } from '../lib/api';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Mode = 'signin' | 'register' | 'forgot';

export function AuthScreen() {
  const { login, register } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Auth'>>();
  const initialMode = params?.mode ?? 'signin';
  const next = params?.next;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
        if (next) navigation.reset({ index: 1, routes: [{ name: 'MainTabs' }, { name: next }] });
        else navigation.navigate('MainTabs');
      } else if (mode === 'register') {
        await register({ email, password, firstName, lastName, phone });
        if (next) navigation.reset({ index: 1, routes: [{ name: 'MainTabs' }, { name: next }] });
        else navigation.navigate('MainTabs');
      } else if (mode === 'forgot') {
        if (!resetToken) {
          const data = await forgotPassword(email);
          setSuccess(data.message ?? 'If the account exists, a reset code has been sent.');
        } else {
          await resetPassword(email, resetToken, password);
          setSuccess('Password updated. You can now sign in.');
          setMode('signin');
          setResetToken('');
          setPassword('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSuccess(null);
  }

  const title = mode === 'signin' ? 'Welcome back' : mode === 'register' ? 'Create an account' : 'Reset password';
  const subtitle = mode === 'signin' ? 'Sign in to your OYE Well account.' : mode === 'register' ? 'Save your details and track orders.' : 'Enter your email to receive a reset code.';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Logo />
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {error && <Text style={styles.error}>{error}</Text>}
            {success && <Text style={styles.success}>{success}</Text>}

            {mode === 'register' && (
              <>
                <TextInput style={styles.input} placeholder="First name" placeholderTextColor={colors.muted} value={firstName} onChangeText={setFirstName} />
                <TextInput style={styles.input} placeholder="Last name" placeholderTextColor={colors.muted} value={lastName} onChangeText={setLastName} />
                <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={colors.muted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            {mode === 'forgot' && (
              <TextInput
                style={styles.input}
                placeholder="Reset code (from email)"
                placeholderTextColor={colors.muted}
                value={resetToken}
                onChangeText={setResetToken}
              />
            )}

            {mode !== 'forgot' && (
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            )}

            {mode === 'forgot' && resetToken && (
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            )}

            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.black} /> : <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign in' : mode === 'register' ? 'Register' : resetToken ? 'Update password' : 'Request reset'}</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
              {mode === 'signin' ? (
                <>
                  <TouchableOpacity onPress={() => switchMode('forgot')}>
                    <Text style={styles.link}>Forgot password?</Text>
                  </TouchableOpacity>
                  <Text style={styles.footerText}>
                    Don't have an account? <Text style={styles.link} onPress={() => switchMode('register')}>Register</Text>
                  </Text>
                </>
              ) : mode === 'register' ? (
                <Text style={styles.footerText}>
                  Already have an account? <Text style={styles.link} onPress={() => switchMode('signin')}>Sign in</Text>
                </Text>
              ) : (
                <Text style={styles.footerText}>
                  <Text style={styles.link} onPress={() => switchMode('signin')}>Back to sign in</Text>
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.md, gap: spacing.xl },
  card: { backgroundColor: colors.white5, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: fontSizes.base },
  input: { backgroundColor: colors.white5, color: colors.white, borderWidth: 1, borderColor: colors.white20, borderRadius: radii.lg, padding: spacing.md },
  button: { backgroundColor: colors.white, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  buttonText: { color: colors.black, fontSize: fontSizes.base, fontWeight: '700' },
  error: { color: colors.danger },
  success: { color: colors.success },
  footer: { gap: spacing.sm, alignItems: 'center' },
  footerText: { color: colors.muted, fontSize: fontSizes.sm },
  link: { color: colors.white, fontSize: fontSizes.sm, textDecorationLine: 'underline' },
});
