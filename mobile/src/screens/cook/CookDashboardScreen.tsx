import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, fontSizes, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';

export function CookDashboardScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Cook Dashboard</Text>
      <Text style={styles.body}>Welcome, {user?.firstName || user?.email}.</Text>
      <Text style={styles.body}>This screen will list incoming orders and menu controls.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.md },
  body: { color: colors.muted, marginBottom: spacing.sm },
});
