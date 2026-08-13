import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { formatPrice, fetchMyOrders, updateProfile, changePassword, fetchDeliveryApplication, type OrderSummary, type DeliveryApplication } from '../../lib/api';
import { fetchCookMe, type CookProfile } from '../../lib/cookApi';
import { useOrderEvents } from '../../lib/events';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import {
  Mail,
  Phone,
  Package,
  ChefHat,
  Bike,
  Shield,
  LogOut,
  Lock,
  Pencil,
  Check,
  MapPin,
} from 'lucide-react-native';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING_PAYMENT: { bg: 'rgba(234,179,8,0.2)', text: '#fde047' },
  PAID: { bg: 'rgba(59,130,246,0.2)', text: '#93c5fd' },
  CONFIRMED: { bg: 'rgba(59,130,246,0.2)', text: '#93c5fd' },
  PREPARING: { bg: 'rgba(168,85,247,0.2)', text: '#d8b4fe' },
  READY_FOR_DISPATCH: { bg: 'rgba(99,102,241,0.2)', text: '#a5b4fc' },
  READY_FOR_PICKUP: { bg: 'rgba(99,102,241,0.2)', text: '#a5b4fc' },
  OUT_FOR_DELIVERY: { bg: 'rgba(6,182,212,0.2)', text: '#67e8f9' },
  DELIVERED: { bg: 'rgba(34,197,94,0.2)', text: '#86efac' },
};

const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'rgba(234,179,8,0.2)', text: '#fde047' },
  PAID: { bg: 'rgba(34,197,94,0.2)', text: '#86efac' },
  FAILED: { bg: 'rgba(239,68,68,0.2)', text: '#fca5a5' },
};

export function AccountScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [cookProfile, setCookProfile] = useState<CookProfile | null>(null);
  const [deliveryApp, setDeliveryApp] = useState<DeliveryApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passSaving, setPassSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }
    const currentUser = user;
    async function load() {
      try {
        const [my, app] = await Promise.all([fetchMyOrders(), fetchDeliveryApplication()]);
        setOrders(my.orders);
        setDeliveryApp(app.rider);
        setFirstName(currentUser.firstName ?? '');
        setLastName(currentUser.lastName ?? '');
        setPhone(currentUser.phone ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load account');
      } finally {
        setLoading(false);
      }
    }
    load();
    fetchCookMe().then((r) => setCookProfile(r.cook)).catch(() => setCookProfile(null));
  }, [authLoading, user]);

  async function refreshOrders() {
    if (!user) return;
    try {
      const { orders: my } = await fetchMyOrders();
      setOrders(my);
    } catch {}
  }

  useOrderEvents((event) => {
    if (['order:status', 'payment:confirmed', 'payment:proof', 'order:created'].includes(event.type)) {
      refreshOrders();
      const payload = event.payload as { orderNumber?: string; status?: string };
      if (payload.orderNumber && payload.status && orders.some((o) => o.orderNumber === payload.orderNumber)) {
        if (AppState.currentState !== 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Order update',
              body: `Order #${payload.orderNumber} is now ${payload.status.replace(/_/g, ' ')}`,
              data: { orderNumber: payload.orderNumber },
            },
            trigger: null,
          });
        }
      }
    }
  }, !!user);

  async function saveProfile() {
    setSaving(true);
    setMsg(null);
    try {
      await updateProfile({ firstName, lastName, phone });
      setEditing(false);
      setMsg('Profile updated.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (!current.trim() || !next.trim()) return;
    setPassSaving(true);
    setPassMsg(null);
    try {
      await changePassword(current.trim(), next.trim());
      setPassMsg('Password updated successfully.');
      setCurrent('');
      setNext('');
    } catch (e) {
      setPassMsg(e instanceof Error ? e.message : 'Failed to update password');
    } finally {
      setPassSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={colors.brand100} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.title}>Sign in to your account</Text>
        <Text style={styles.muted}>Your order history and settings live here.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Auth', { mode: 'signin' })}>
          <Text style={styles.primaryButtonText}>Sign in or register</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentOrders = orders.filter((o) => o.status !== 'DELIVERED');
  const previousOrders = orders.filter((o) => o.status === 'DELIVERED');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Hi, {user.firstName || user.email.split('@')[0] || 'customer'}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>Customer</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.profileCard}>
          {!editing ? (
            <View>
              <View style={styles.profileRow}>
                <Mail size={16} color={colors.muted} />
                <Text style={styles.profileLabel}>Email</Text>
              </View>
              <Text style={styles.profileValue}>{user.email}</Text>
              <View style={styles.profileRow}>
                <Phone size={16} color={colors.muted} />
                <Text style={styles.profileLabel}>Phone</Text>
              </View>
              <Text style={styles.profileValue}>{user.phone || 'Not set'}</Text>
              <View style={styles.profileRow}>
                <Package size={16} color={colors.muted} />
                <Text style={styles.profileLabel}>Balance</Text>
              </View>
              <Text style={styles.profileValue}>{formatPrice(user.balanceKobo)}</Text>
              <View style={styles.profileRow}>
                <Package size={16} color={colors.muted} />
                <Text style={styles.profileLabel}>Total orders</Text>
              </View>
              <Text style={styles.profileValue}>{orders.length}</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditing(true)}>
                <Pencil size={16} color={colors.white} />
                <Text style={styles.secondaryButtonText}>Edit profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={colors.muted} />
              <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={colors.muted} />
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={colors.muted} keyboardType="phone-pad" />
              {msg && <Text style={styles.msg}>{msg}</Text>}
              <TouchableOpacity style={styles.primaryButton} onPress={saveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.brand900} /> : (
                  <>
                    <Check size={18} color={colors.brand900} />
                    <Text style={styles.primaryButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, { marginTop: spacing.sm }]} onPress={() => setEditing(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Quick actions</Text>
          <Text style={styles.panelBody}>Become a cook or start delivering.</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => {
                if (cookProfile?.profileStatus === 'PENDING_APPROVAL') {
                  Alert.alert('Application pending', 'Your cook application is under review.');
                  return;
                }
                if (cookProfile?.profileStatus === 'APPROVED') {
                  navigation.navigate('CookListingForm', {});
                } else {
                  navigation.navigate('CookApply');
                }
              }}
            >
              <ChefHat size={18} color={colors.brand900} />
              <Text style={styles.quickActionText}>{cookProfile ? 'Cook portal' : 'Become a cook'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('RiderApply')}
            >
              <Bike size={18} color={colors.brand900} />
              <Text style={styles.quickActionText}>
                {deliveryApp
                  ? deliveryApp.isApproved
                    ? 'Delivery portal'
                    : deliveryApp.neighborhoodApproval === 'REJECTED'
                    ? 'Reapply to deliver'
                    : `Application: ${deliveryApp.neighborhoodApproval.toLowerCase()}`
                  : user.role === 'RIDER' || user.roles?.includes('RIDER')
                  ? 'Delivery portal'
                  : 'Make money on OyeWell'}
              </Text>
            </TouchableOpacity>

            {(user.role === 'ADMIN' || user.roles?.includes('ADMIN')) && (
              <TouchableOpacity style={styles.quickAction} onPress={() => Alert.alert('Admin dashboard', 'Switch to the Dashboard tab.') }>
                <Shield size={18} color={colors.brand900} />
                <Text style={styles.quickActionText}>Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.stats}>
          <StatBox label="Active" count={currentOrders.length} color="rgba(234,179,8,0.2)" textColor="#fde047" />
          <StatBox label="Delivered" count={previousOrders.length} color="rgba(34,197,94,0.2)" textColor="#86efac" />
          <StatBox label="All time" count={orders.length} color="rgba(59,130,246,0.2)" textColor="#93c5fd" />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Active orders</Text>
          <Text style={styles.panelBody}>Orders that are being prepared or on their way to you.</Text>
          <OrderList orders={currentOrders} navigation={navigation} empty="No active orders." />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Order history</Text>
          <Text style={styles.panelBody}>Completed and delivered orders.</Text>
          <OrderList orders={previousOrders} navigation={navigation} empty="No completed orders." />
        </View>

        <View style={styles.panel}>
          <View style={styles.profileRow}>
            <Lock size={18} color={colors.muted} />
            <Text style={styles.panelTitle}>Change password</Text>
          </View>
          {passMsg && <Text style={styles.msg}>{passMsg}</Text>}
          <TextInput style={styles.input} value={current} onChangeText={setCurrent} placeholder="Current password" placeholderTextColor={colors.muted} secureTextEntry />
          <TextInput style={styles.input} value={next} onChangeText={setNext} placeholder="New password" placeholderTextColor={colors.muted} secureTextEntry />
          <TouchableOpacity style={styles.primaryButton} onPress={savePassword} disabled={passSaving}>
            {passSaving ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.primaryButtonText}>Update password</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logout} onPress={logout}>
          <LogOut size={18} color={colors.muted} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, count, color, textColor }: { label: string; count: number; color: string; textColor: string }) {
  return (
    <View style={[styles.statBox, { backgroundColor: color }]}>
      <Text style={[styles.statValue, { color: textColor }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function OrderList({
  orders,
  navigation,
  empty,
}: {
  orders: OrderSummary[];
  navigation: NativeStackNavigationProp<RootStackParamList>;
  empty: string;
}) {
  if (orders.length === 0) {
    return <Text style={styles.emptyText}>{empty}</Text>;
  }
  return (
    <View style={styles.orderList}>
      {orders.map((order) => (
        <TouchableOpacity
          key={order.id}
          style={styles.orderCard}
          onPress={() => navigation.navigate('Track', { orderNumber: order.orderNumber, initialOrder: order })}
          activeOpacity={0.7}
        >
          <View style={[styles.orderRow, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <View style={styles.orderRowInline}>
                <Package size={14} color={colors.muted} />
                <Text style={styles.orderNumber} numberOfLines={1}>#{order.orderNumber}</Text>
              </View>
              <Text style={styles.meta}>
                {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={[styles.badges, { alignItems: 'flex-start' }]}>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[order.status]?.bg ?? 'rgba(255,255,255,0.1)' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLORS[order.status]?.text ?? colors.white }]}>
                  {order.status.replace(/_/g, ' ')}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: PAYMENT_COLORS[order.paymentStatus]?.bg ?? 'rgba(255,255,255,0.1)' }]}>
                <Text style={[styles.badgeText, { color: PAYMENT_COLORS[order.paymentStatus]?.text ?? colors.white }]}>
                  {order.paymentStatus}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.items}>
            {order.items.map((item, idx) => (
              <Text key={idx} style={styles.itemLine} numberOfLines={2}>
                {item.quantity}× {item.foodName} — {item.optionLabel}
              </Text>
            ))}
            {order.sides.length > 0 && (
              <Text style={styles.sidesLine} numberOfLines={2}>
                + {order.sides.map((s) => `${s.quantity}× ${s.name}`).join(', ')}
              </Text>
            )}
          </View>
          <View style={[styles.orderRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: spacing.sm, marginTop: spacing.sm, alignItems: 'center' }]}>
            <View style={[styles.orderRowInline, { flex: 1 }]}>
              <MapPin size={14} color={colors.muted} />
              <Text style={[styles.meta, { flex: 1 }]} numberOfLines={1}>{order.address}</Text>
            </View>
            <Text style={styles.total}>{order.total}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  scroll: { paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800' },
  roleTag: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full },
  roleTagText: { color: colors.muted, fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  profileLabel: { color: colors.muted, fontSize: fontSizes.sm },
  profileValue: { color: colors.white, fontSize: fontSizes.base, fontWeight: '600', marginBottom: spacing.xs, marginLeft: spacing.lg },
  panel: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  panelTitle: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700' },
  panelBody: { color: colors.muted, fontSize: fontSizes.sm, marginBottom: spacing.md },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.brand100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full },
  quickActionText: { color: colors.brand900, fontWeight: '700', fontSize: fontSizes.sm },
  stats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statBox: { flex: 1, borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  statValue: { fontSize: fontSizes.xxl, fontWeight: '800' },
  statLabel: { fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.xs },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', color: colors.white, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: spacing.md },
  primaryButton: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  primaryButtonText: { color: colors.brand900, fontWeight: '700' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: spacing.md, borderRadius: radii.full, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  secondaryButtonText: { color: colors.white, fontWeight: '700' },
  msg: { color: '#86efac', marginBottom: spacing.md },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.2)', padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  errorText: { color: '#fca5a5' },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.md, borderRadius: radii.full },
  logoutText: { color: colors.muted, fontWeight: '700' },
  muted: { color: colors.muted, marginBottom: spacing.md },
  orderList: { marginTop: spacing.md },
  orderCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  orderRowInline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  orderNumber: { color: colors.white, fontWeight: '700' },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  badge: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: fontSizes.xs, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: fontSizes.sm, flex: 1 },
  items: { marginTop: spacing.sm },
  itemLine: { color: 'rgba(255,255,255,0.7)', fontSize: fontSizes.sm, marginBottom: spacing.xs },
  sidesLine: { color: 'rgba(255,255,255,0.5)', fontSize: fontSizes.sm },
  total: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: fontSizes.sm, marginTop: spacing.sm },
});
