import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';

export function AccountScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Account</Text>
      {user ? (
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user.role}</Text>
          <TouchableOpacity style={styles.button} onPress={logout}>
            <Text style={styles.buttonText}>Log out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.muted}>Not signed in</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.lg },
  card: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg },
  label: { color: colors.muted, marginTop: spacing.sm },
  value: { color: colors.white, marginBottom: spacing.sm },
  button: { backgroundColor: colors.danger, padding: spacing.md, borderRadius: radii.full, marginTop: spacing.lg, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '700' },
  muted: { color: colors.muted },
});
