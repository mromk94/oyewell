import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/AppNavigator';

interface Order {
  orderNumber: string;
  status: string;
  deliveryCode?: string;
  totalKobo: number;
}

export function TrackOrderScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Track'>>();
  const { orderNumber } = params!;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: wire to GET /api/orders/:orderNumber
    setTimeout(() => {
      setOrder({ orderNumber, status: 'PENDING', deliveryCode: '0000', totalKobo: 0 });
      setLoading(false);
    }, 500);
  }, [orderNumber]);

  if (loading) return <ActivityIndicator color={colors.brand100} style={styles.loader} />;
  if (!order) return <Text style={styles.error}>Order not found</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Order {order.orderNumber}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{order.status}</Text>
        <Text style={styles.label}>Delivery code</Text>
        <Text style={styles.code}>{order.deliveryCode}</Text>
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
});
