import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert, Modal } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { useOrderEvents } from '../../lib/events';
import { fetchCookOrders, acceptCookOrder, preparingCookOrder, readyCookOrder, fetchCookEarnings, updateKitchenStatus, type CookOrder } from '../../lib/cookApi';
import { ChefHat, Wallet, Check, Package, Info } from 'lucide-react-native';

const STATUS_INFO: Record<'OPEN' | 'PAUSED' | 'CLOSED', string> = {
  OPEN: 'You are accepting new orders and customers can place orders.',
  PAUSED: 'Your kitchen is still visible but customers cannot place new orders.',
  CLOSED: 'Your kitchen is closed. No new orders until you reopen.',
};

export function CookDashboardScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CookOrder[]>([]);
  const [earnings, setEarnings] = useState<{ total: string; available: string } | null>(null);
  const [kitchenStatus, setKitchenStatus] = useState<'OPEN' | 'CLOSED' | 'PAUSED'>('OPEN');
  const [loading, setLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);

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

  function refresh() {
    Promise.all([fetchCookOrders(), fetchCookEarnings()])
      .then(([ordersData, earningsData]) => {
        setOrders(ordersData.orders);
        setEarnings({ total: earningsData.earnings.total, available: earningsData.earnings.available });
      })
      .catch(() => {});
  }

  useEffect(() => { load(); }, []);
  useOrderEvents((event) => {
    if (['order:status', 'payment:confirmed', 'payment:proof', 'order:created'].includes(event.type)) {
      refresh();
      if (event.type === 'order:created') {
        const payload = event.payload as { orderNumber?: string } | undefined;
        Alert.alert('New order', `Order #${payload?.orderNumber ?? 'new'} has been placed.`);
      }
    }
  });

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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ChefHat size={28} color={colors.brand100} />
          <Text style={styles.title}>Cook Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.info} onPress={() => setInfoOpen(true)}>
          <Info size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>
      <Text style={styles.body}>Welcome, {user?.firstName || user?.email}.</Text>

      {earnings && (
        <View style={styles.earningsCard}>
          <View style={styles.earningsPill}>
            <Wallet size={16} color="#86efac" />
            <View>
              <Text style={styles.earningsLabel}>Available</Text>
              <Text style={styles.earningsValue}>{earnings.available}</Text>
            </View>
          </View>
          <View style={styles.earningsPill}>
            <Wallet size={16} color="#93c5fd" />
            <View>
              <Text style={styles.earningsLabel}>Total</Text>
              <Text style={styles.earningsValue}>{earnings.total}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.statusRow}>
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
                {item.status === 'PENDING' && <Action onPress={() => updateOrder(item.orderNumber, 'accept')} label="Accept" icon={Check} />}
                {item.status === 'ACCEPTED' && <Action onPress={() => updateOrder(item.orderNumber, 'preparing')} label="Preparing" icon={ChefHat} />}
                {item.status === 'PREPARING' && <Action onPress={() => updateOrder(item.orderNumber, 'ready')} label="Ready" icon={Package} />}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={infoOpen} transparent animationType="fade" onRequestClose={() => setInfoOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Kitchen status</Text>
            <Text style={styles.modalBody}>
              {STATUS_INFO[kitchenStatus]}
            </Text>
            <View style={styles.modalOptions}>
              {(['OPEN', 'PAUSED', 'CLOSED'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.modalOption, kitchenStatus === s && styles.modalOptionActive]}
                  onPress={() => { setStatus(s); setInfoOpen(false); }}
                >
                  <Text style={[styles.modalOptionText, kitchenStatus === s && styles.modalOptionTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setInfoOpen(false)}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Action({ onPress, label, icon: Icon }: { onPress: () => void; label: string; icon: typeof Check }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <Icon size={14} color={colors.brand900} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800' },
  info: { padding: spacing.sm },
  body: { color: colors.muted, marginBottom: spacing.md },
  list: { paddingBottom: spacing.xl },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  order: { backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  earningsCard: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  earningsPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(34,197,94,0.2)', padding: spacing.md, borderRadius: radii.lg },
  earningsLabel: { color: colors.muted, fontSize: fontSizes.xs, marginBottom: spacing.xs },
  earningsValue: { color: '#86efac', fontSize: fontSizes.lg, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statusButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: spacing.sm, borderRadius: radii.md, alignItems: 'center' },
  statusButtonActive: { backgroundColor: colors.brand100 },
  statusText: { color: colors.muted },
  statusTextActive: { color: colors.brand900, fontWeight: '700' },
  number: { color: colors.white, fontWeight: '600' },
  status: { color: colors.brand100 },
  items: { color: colors.muted, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.brand100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md },
  actionText: { color: colors.brand900, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.brand900, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800', marginBottom: spacing.sm },
  modalBody: { color: colors.muted, marginBottom: spacing.md },
  modalOptions: { marginBottom: spacing.md },
  modalOption: { backgroundColor: 'rgba(255,255,255,0.08)', padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.sm, alignItems: 'center' },
  modalOptionActive: { backgroundColor: colors.brand100 },
  modalOptionText: { color: colors.white, fontWeight: '700' },
  modalOptionTextActive: { color: colors.brand900, fontWeight: '700' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  secondaryButtonText: { color: colors.white, fontWeight: '700' },
});
