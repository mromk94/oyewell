import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { fetchCookOrders, acceptCookOrder, preparingCookOrder, readyCookOrder, type CookOrder } from '../../lib/cookApi';

export function CookDashboardScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CookOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCookOrders()
      .then(({ orders }) => setOrders(orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

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
              <Text style={styles.items}>{item.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}</Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  number: { color: colors.white, fontWeight: '600' },
  status: { color: colors.brand100 },
  items: { color: colors.muted, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { backgroundColor: colors.brand100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md },
  actionText: { color: colors.brand900, fontWeight: '600' },
});
