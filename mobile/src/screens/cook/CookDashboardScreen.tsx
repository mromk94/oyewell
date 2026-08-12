import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { useInterval } from '../../lib/polling';
import { fetchCookOrders, acceptCookOrder, preparingCookOrder, readyCookOrder, fetchCookEarnings, updateKitchenStatus, type CookOrder } from '../../lib/cookApi';

export function CookDashboardScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CookOrder[]>([]);
  const [earnings, setEarnings] = useState<{ total: string; available: string } | null>(null);
  const [kitchenStatus, setKitchenStatus] = useState<'OPEN' | 'CLOSED' | 'PAUSED'>('OPEN');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([fetchCookOrders(), fetchCookEarnings()])
      .then(([ordersData, earningsData]) => {
        setOrders(ordersData.orders);
        setEarnings({ total: earningsData.earnings.total, available: earningsData.earnings.available });
      })
      .catch(() => {
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);
  useInterval(load, 15000);

  async function setStatus(status: 'OPEN' | 'CLOSED' | 'PAUSED') {
    try {
      const { kitchenStatus: next } = await updateKitchenStatus(status);
      setKitchenStatus(next as 'OPEN' | 'CLOSED' | 'PAUSED');
    } catch (err) {
      console.error(err);
    }
  }

  async function updateOrder(orderNumber: string, action: 'accept' | 'preparing' | 'ready') {
    try {
      let res: { order: CookOrder };
      if (action === 'accept') res = await acceptCookOrder(orderNumber);
      else if (action === 'preparing') res = await preparingCookOrder(orderNumber);
      else res = await readyCookOrder(orderNumber);
      setOrders((prev) => prev.map((o) => (o.orderNumber === orderNumber ? res.order : o)));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Cook Dashboard</Text>
      <Text style={styles.body}>Welcome, {user?.firstName || user?.email}.</Text>

      {earnings && (
        <View style={styles.earnings}>
          <View style={styles.row}>
            <View>
              <Text style={styles.earningsLabel}>Available</Text>
              <Text style={styles.earningsValue}>{earnings.available}</Text>
            </View>
            <View>
              <Text style={styles.earningsLabel}>Total</Text>
              <Text style={styles.earningsValue}>{earnings.total}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.row}>
        {(['OPEN', 'PAUSED', 'CLOSED'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusButton, kitchenStatus === s && styles.statusButtonActive]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.statusText, kitchenStatus === s && styles.statusTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={colors.brand100} /> : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.orderNumber}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.order}>
              <View style={styles.row}>
                <Text style={styles.number}>#{item.orderNumber}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <Text style={styles.items}>{item.items.map((i) => `${i.quantity}x ${i.foodName}`).join(', ')}</Text>
              <View style={styles.actions}>
                {item.status === 'PENDING' && <Action onPress={() => updateOrder(item.orderNumber, 'accept')} label="Accept" />}
                {item.status === 'ACCEPTED' && <Action onPress={() => updateOrder(item.orderNumber, 'preparing')} label="Preparing" />}
                {item.status === 'PREPARING' && <Action onPress={() => updateOrder(item.orderNumber, 'ready')} label="Ready" />}
              </View>
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
  list: { paddingBottom: spacing.md },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  order: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  earnings: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  earningsLabel: { color: colors.muted, marginBottom: spacing.xs },
  earningsValue: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700' },
  statusButton: { backgroundColor: colors.brand800, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md },
  statusButtonActive: { backgroundColor: colors.brand100 },
  statusText: { color: colors.muted },
  statusTextActive: { color: colors.brand900, fontWeight: '700' },
  number: { color: colors.white, fontWeight: '600' },
  status: { color: colors.brand100 },
  items: { color: colors.muted, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { backgroundColor: colors.brand100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md },
  actionText: { color: colors.brand900, fontWeight: '600' },
});
