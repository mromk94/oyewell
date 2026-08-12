import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing, fontSizes } from '../theme';

export function AuthScreen() {
  const { login, register } = useAuth();
  const navigation = useNavigation();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register({ email, password, firstName, lastName });
      }
      navigation.navigate('MainTabs' as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === 'signin' ? 'Welcome back' : 'Create account'}</Text>

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
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign In' : 'Register'}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'register' : 'signin')}>
        <Text style={styles.switch}>{mode === 'signin' ? 'Create an account' : 'Already have an account?'}</Text>
      </TouchableOpacity>
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
  switch: { color: colors.muted, textAlign: 'center', marginTop: spacing.md },
});
