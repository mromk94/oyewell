import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, FlatList } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { fetchOrder, formatPrice, type FullOrder } from '../../lib/api';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export function TrackOrderScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Track'>>();
  const { orderNumber } = params!;
  const [order, setOrder] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder(orderNumber)
      .then(({ order }) => setOrder(order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) return <ActivityIndicator color={colors.brand100} style={styles.loader} />;
  if (!order) return <Text style={styles.error}>Order not found</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Order {order.orderNumber}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{order.status}</Text>
        <Text style={styles.label}>Total</Text>
        <Text style={styles.value}>{formatPrice(order.totalKobo)}</Text>
        <Text style={styles.label}>Delivery code</Text>
        <Text style={styles.code}>{order.deliveryCode}</Text>

        <Text style={[styles.label, { marginTop: spacing.md }]}>Items</Text>
        {order.items.map((item, index) => (
          <Text key={index} style={styles.itemText}>{item.quantity}x {item.name}</Text>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.md },
  card: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg },
  label: { color: colors.muted, marginTop: spacing.sm },
  value: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '600' },
  code: { color: colors.brand100, fontSize: fontSizes.xxl, fontWeight: '700', letterSpacing: 2 },
  itemText: { color: colors.muted, marginTop: spacing.xs },
});
