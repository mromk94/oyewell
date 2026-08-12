import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, fontSizes, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';

export function AdminDashboardScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Management</Text>
      <Text style={styles.body}>Welcome, {user?.firstName || user?.email}.</Text>
      <Text style={styles.body}>This screen will host the operational dashboard for admin/moderation staff.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.md },
  body: { color: colors.muted, marginBottom: spacing.sm },
});
