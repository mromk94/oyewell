import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Switch } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import {
  fetchRiderProfile,
  updateRiderAvailability,
  fetchAvailableDeliveries,
  fetchRiderOrders,
  claimDelivery,
  startTrip,
  type RiderDelivery,
} from '../../lib/riderApi';

export function RiderDashboardScreen() {
  const { user } = useAuth();
  const [available, setAvailable] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<RiderDelivery[]>([]);
  const [myOrders, setMyOrders] = useState<RiderDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [{ rider }, { orders: open }, { orders: mine }] = await Promise.all([
        fetchRiderProfile(),
        fetchAvailableDeliveries(),
        fetchRiderOrders(),
      ]);
      setAvailable(rider.available);
      setAvailableOrders(open);
      setMyOrders(mine);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleAvailability(value: boolean) {
    try {
      const { rider } = await updateRiderAvailability(value);
      setAvailable(rider.available);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleClaim(orderNumber: string) {
    try {
      await claimDelivery(orderNumber);
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleStartTrip(orderNumber: string) {
    try {
      await startTrip(orderNumber);
      load();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Rider Dashboard</Text>
      <Text style={styles.body}>Welcome, {user?.firstName || user?.email}.</Text>

      <View style={styles.row}>
        <Text style={styles.body}>Available</Text>
        <Switch value={available} onValueChange={toggleAvailability} trackColor={{ false: colors.brand800, true: colors.brand100 }} thumbColor={colors.white} />
      </View>

      {loading ? <ActivityIndicator color={colors.brand100} /> : (
        <FlatList
          data={[...myOrders, ...availableOrders]}
          keyExtractor={(item) => item.orderNumber}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No deliveries.</Text>}
          renderItem={({ item }) => (
            <View style={styles.order}>
              <View style={styles.row}>
                <Text style={styles.number}>#{item.orderNumber}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <Text style={styles.address}>{item.customerAddress}</Text>
              {item.status === 'READY_FOR_PICKUP' && <Action onPress={() => handleClaim(item.orderNumber)} label="Claim" />}
              {item.status === 'CLAIMED' && <Action onPress={() => handleStartTrip(item.orderNumber)} label="Start trip" />}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Action({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.md },
  body: { color: colors.muted, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  list: { paddingBottom: spacing.md },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  order: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  number: { color: colors.white, fontWeight: '600' },
  status: { color: colors.brand100 },
  address: { color: colors.muted, marginBottom: spacing.sm },
  action: { backgroundColor: colors.brand100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, alignSelf: 'flex-start' },
  actionText: { color: colors.brand900, fontWeight: '600' },
});
