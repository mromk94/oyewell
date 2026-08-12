import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing, fontSizes } from '../theme';
import { forgotPassword, resetPassword } from '../lib/api';

type Mode = 'signin' | 'register' | 'forgot';

export function AuthScreen() {
  const { login, register } = useAuth();
  const navigation = useNavigation();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
        navigation.navigate('MainTabs' as never);
      } else if (mode === 'register') {
        await register({ email, password, firstName, lastName });
        navigation.navigate('MainTabs' as never);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === 'signin' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Reset password'}
      </Text>

      {mode === 'register' && (
        <>
          <TextInput style={styles.input} placeholder="First name" placeholderTextColor={colors.muted} value={firstName} onChangeText={setFirstName} />
          <TextInput style={styles.input} placeholder="Last name" placeholderTextColor={colors.muted} value={lastName} onChangeText={setLastName} />
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
        <>
          <TextInput
            style={styles.input}
            placeholder="Reset code (from email)"
            placeholderTextColor={colors.muted}
            value={resetToken}
            onChangeText={setResetToken}
          />
          {resetToken && (
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          )}
        </>
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

      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>{success}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign In' : mode === 'register' ? 'Register' : resetToken ? 'Update password' : 'Request reset'}</Text>}
      </TouchableOpacity>

      <View style={styles.switches}>
        <TouchableOpacity onPress={() => setMode('signin')}>
          <Text style={styles.switch}>Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('register')}>
          <Text style={styles.switch}>Create account</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('forgot')}>
          <Text style={styles.switch}>Forgot password?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.brand900, justifyContent: 'center' },
  title: { color: colors.white, fontSize: fontSizes.hero, marginBottom: spacing.lg, fontWeight: '700' },
  input: { backgroundColor: colors.brand800, color: colors.white, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  button: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  buttonText: { color: colors.brand900, fontWeight: '700' },
  error: { color: colors.danger, marginBottom: spacing.md },
  success: { color: colors.success, marginBottom: spacing.md },
  switches: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  switch: { color: colors.muted, textAlign: 'center' },
});
