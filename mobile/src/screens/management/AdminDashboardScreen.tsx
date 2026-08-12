import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, FlatList } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { fetchAdminDashboard, fetchAdminReports, type AdminDashboard, type AdminReports } from '../../lib/adminApi';

export function AdminDashboardScreen() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAdminDashboard(), fetchAdminReports()])
      .then(([dash, reps]) => {
        setDashboard(dash.dashboard);
        setReports(reps.reports);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = dashboard
    ? [
        { label: 'Today orders', value: dashboard.today.orders },
        { label: 'New cooks', value: dashboard.today.newCooks },
        { label: 'New riders', value: dashboard.today.newRiders },
        { label: 'Active deliveries', value: dashboard.delivery.activeDeliveries },
      ]
    : [];

  const attention = dashboard
    ? [
        { label: 'Pending approvals', value: dashboard.attention.pendingApprovals },
        { label: 'Open disputes', value: dashboard.attention.openDisputes },
        { label: 'Open tickets', value: dashboard.attention.openTickets },
        { label: 'Open reports', value: dashboard.attention.openReports },
      ]
    : [];

  const reportItems = reports
    ? [
        { label: 'Open tickets', value: reports.openTickets },
        { label: 'Resolved tickets', value: reports.resolvedTickets },
        { label: 'Open disputes', value: reports.openDisputes },
        { label: 'Cooks pending', value: reports.cooksPending },
      ]
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Management</Text>
      <Text style={styles.body}>Welcome, {user?.firstName || user?.email}.</Text>

      {loading ? <ActivityIndicator color={colors.brand100} /> : (
        <>
          <Text style={styles.section}>Today</Text>
          <FlatList
            data={today}
            numColumns={2}
            keyExtractor={(item) => item.label}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.value}>{item.value}</Text>
                <Text style={styles.label}>{item.label}</Text>
              </View>
            )}
          />

          <Text style={styles.section}>Needs attention</Text>
          {attention.map((item) => (
            <View key={item.label} style={styles.row}>
              <Text style={styles.body}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}

          <Text style={styles.section}>Operations</Text>
          {reportItems.map((item) => (
            <View key={item.label} style={styles.row}>
              <Text style={styles.body}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.md },
  body: { color: colors.muted, marginBottom: spacing.sm },
  section: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.md },
  grid: { paddingBottom: spacing.md },
  card: { flex: 1, backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, margin: spacing.xs, minHeight: 80 },
  label: { color: colors.muted, marginTop: spacing.xs },
  value: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
});
