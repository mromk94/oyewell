import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { useOrderEvents } from '../../lib/events';
import { formatPrice } from '../../lib/api';
import {
  fetchRiderMe,
  updateRiderAvailability,
  updateRiderMe,
  fetchRiderOrders,
  fetchAvailableOrders,
  claimOrder,
  pickupOrder,
  startTrip,
  verifyDeliveryCode,
  fetchRiderEarnings,
  fetchRiderPayouts,
  withdrawRiderEarnings,
  applyProfessionalUpgrade,
  type Rider,
  type RiderOrder,
  type RiderEarnings,
  type RiderPayout,
} from '../../lib/riderApi';
import { Bike, Package, ClipboardList, ShieldCheck, Banknote, MapPin, Phone, Navigation, Shield, LogOut, Wallet, Info } from 'lucide-react-native';

type TabId = 'orders' | 'available' | 'verify' | 'earnings' | 'profile';

const TABS: { id: TabId; label: string; icon: typeof Bike }[] = [
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'available', label: 'Available', icon: ClipboardList },
  { id: 'verify', label: 'Verify', icon: ShieldCheck },
  { id: 'earnings', label: 'Earnings', icon: Banknote },
  { id: 'profile', label: 'Profile', icon: Bike },
];

export function RiderDashboardScreen() {
  const { user, logout } = useAuth();
  const [rider, setRider] = useState<Rider | null>(null);
  const [tab, setTab] = useState<TabId>('orders');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineInfo, setOnlineInfo] = useState(false);
  const [profile, setProfile] = useState({ vehicle: '', bankName: '', bankAccountName: '', bankAccountNumber: '' });

  const loadRider = useCallback(async () => {
    try {
      const { rider: r } = await fetchRiderMe();
      setRider(r);
      setProfile({
        vehicle: r.vehicle ?? '',
        bankName: r.bankName ?? '',
        bankAccountName: r.bankAccountName ?? '',
        bankAccountNumber: r.bankAccountNumber ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rider');
    }
  }, []);

  useEffect(() => { loadRider().finally(() => setLoading(false)); }, [loadRider]);

  async function toggleAvailability(value: boolean) {
    if (!rider) return;
    try {
      const { rider: updated } = await updateRiderAvailability(value);
      setRider(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function saveProfile() {
    setError(null);
    try {
      const { rider: updated } = await updateRiderMe(profile);
      setRider(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (loading) {
    return (
      <SafeArea style={styles.container} edges={['top']}>
        <ActivityIndicator color={colors.brand100} style={{ marginTop: spacing.xl }} />
      </SafeArea>
    );
  }

  if (!rider) {
    return (
      <SafeArea style={styles.container} edges={['top']}>
        <Text style={styles.title}>Rider Portal</Text>
        <Text style={styles.empty}>Sign in as a rider to continue.</Text>
      </SafeArea>
    );
  }

  return (
    <SafeArea style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Bike size={28} color={colors.brand100} />
            <Text style={styles.title}>Rider Portal</Text>
          </View>
          <TouchableOpacity style={styles.logout} onPress={logout}>
            <LogOut size={16} color={colors.muted} />
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <Text style={styles.welcomeBack}>Welcome back</Text>
            <Text style={styles.riderName}>{rider.user?.firstName || 'Rider'} {rider.user?.lastName}</Text>
            <Text style={styles.riderEmail}>{rider.user?.email}</Text>
            <View style={styles.tags}>
              <View style={styles.balancePill}>
                <Wallet size={14} color="#86efac" />
                <Text style={styles.balancePillText}>{formatPrice(rider.user?.balanceKobo ?? 0)}</Text>
              </View>
              <View style={styles.approvalTag}>
                {rider.professionalApproval === 'APPROVED' ? <Shield size={14} color="#93c5fd" /> : <MapPin size={14} color="#93c5fd" />}
                <Text style={styles.approvalTagText}>{rider.professionalApproval === 'APPROVED' ? 'Professional' : 'Neighborhood'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.profileRight}>
            <OnlineToggle rider={rider} onShowInfo={() => setOnlineInfo(true)} />
            {rider.professionalApproval === 'NOT_APPLIED' && (
              <UpgradeButton onOpen={() => setTab('profile')} />
            )}
          </View>
        </View>

        <OnlineInfoModal
          visible={onlineInfo}
          rider={rider}
          onClose={() => setOnlineInfo(false)}
          onSet={(value) => {
            setOnlineInfo(false);
            toggleAvailability(value);
          }}
        />

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabNav}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, tab === t.id && styles.tabActive]}
              onPress={() => setTab(t.id)}
            >
              <t.icon size={20} color={tab === t.id ? colors.brand900 : colors.muted} />
              <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {tab === 'orders' && <MyOrdersPanel rider={rider} onError={setError} />}
        {tab === 'available' && <AvailableOrdersPanel onError={setError} />}
        {tab === 'verify' && <VerifyPanel onError={setError} />}
        {tab === 'earnings' && <EarningsPanel onError={setError} />}
        {tab === 'profile' && (
          <ProfilePanel
            rider={rider}
            profile={profile}
            setProfile={setProfile}
            onSave={saveProfile}
            onError={setError}
            onUpdated={setRider}
          />
        )}
      </ScrollView>
    </SafeArea>
  );
}

function OnlineToggle({ rider, onShowInfo }: { rider: Rider; onShowInfo: () => void }) {
  if (!rider.isApproved || !rider.isActive) {
    return (
      <View style={[styles.onlineButton, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
        <Text style={{ color: '#fca5a5' }}>Account inactive</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={[
        styles.onlineButton,
        rider.available ? { backgroundColor: colors.brand100 } : { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
      ]}
      onPress={onShowInfo}
    >
      <Info size={14} color={rider.available ? colors.brand900 : colors.muted} />
      <Text style={rider.available ? styles.onlineTextActive : styles.onlineText}>{rider.available ? 'Active' : 'Resting'}</Text>
    </TouchableOpacity>
  );
}

function UpgradeButton({ onOpen }: { onOpen: () => void }) {
  return (
    <TouchableOpacity style={styles.upgrade} onPress={onOpen}>
      <Shield size={16} color={colors.white} />
      <Text style={styles.upgradeText}>Upgrade to professional</Text>
    </TouchableOpacity>
  );
}

function OnlineInfoModal({
  visible,
  rider,
  onClose,
  onSet,
}: {
  visible: boolean;
  rider: Rider;
  onClose: () => void;
  onSet: (value: boolean) => void;
}) {
  const isActive = rider.available;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Availability</Text>
          <Text style={styles.modalBody}>
            Active means you are accepting delivery requests right now. Resting keeps you logged in but pauses new requests, so you can take a break without going offline.
          </Text>

          <TouchableOpacity
            style={[styles.onlineOption, isActive && styles.onlineOptionActive]}
            onPress={() => onSet(true)}
          >
            <View style={[styles.dot, { backgroundColor: colors.brand900 }]} />
            <View style={styles.onlineOptionText}>
              <Text style={isActive ? styles.onlineOptionLabelActive : styles.onlineOptionLabel}>Active</Text>
              <Text style={styles.onlineOptionSub}>Receive delivery requests</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.onlineOption, !isActive && styles.onlineOptionActive]}
            onPress={() => onSet(false)}
          >
            <View style={[styles.dot, { backgroundColor: '#fca5a5' }]} />
            <View style={styles.onlineOptionText}>
              <Text style={!isActive ? styles.onlineOptionLabelActive : styles.onlineOptionLabel}>Resting</Text>
              <Text style={styles.onlineOptionSub}>Stay logged in, no new requests</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function MyOrdersPanel({ rider, onError }: { rider: Rider; onError: (m: string) => void }) {
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<{ type: 'pickup' | 'delivery' | null; orderNumber: string }>({ type: null, orderNumber: '' });
  const [startConfirm, setStartConfirm] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { orders } = await fetchRiderOrders();
      setOrders(orders);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    try {
      const { orders } = await fetchRiderOrders();
      setOrders(orders);
    } catch {}
  }

  useEffect(() => { load(); }, []);
  useOrderEvents((event) => {
    if (['order:status', 'delivery:assigned', 'delivery:completed', 'payment:confirmed', 'payment:proof'].includes(event.type)) {
      refresh();
    }
  });

  async function handlePickup(orderNumber: string, code: string) {
    try {
      await pickupOrder(orderNumber, code);
      setPrompt({ type: null, orderNumber: '' });
      load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Pickup failed');
    }
  }

  async function handleDelivery(orderNumber: string, code: string) {
    try {
      await verifyDeliveryCode(orderNumber, code);
      setPrompt({ type: null, orderNumber: '' });
      load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Delivery failed');
    }
  }

  async function handleStart(orderNumber: string) {
    try {
      await startTrip(orderNumber);
      setStartConfirm(null);
      load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Start trip failed');
    }
  }

  if (loading) return <Loader />;
  if (!orders.length) return <Empty message="No assigned orders yet." />;

  return (
    <View>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} actions={[
          ...(order.status === 'OUT_FOR_DELIVERY' && order.riderStatus === 'ASSIGNED' ? [{ label: 'I have collected the food', onPress: () => setPrompt({ type: 'pickup', orderNumber: order.orderNumber }) }] : []),
          ...(order.riderStatus === 'PICKED_UP' ? [
            { label: 'I am on my way', onPress: () => setStartConfirm(order.orderNumber) },
            { label: 'Customer has their food', onPress: () => setPrompt({ type: 'delivery', orderNumber: order.orderNumber }) },
          ] : []),
          ...(order.riderStatus === 'IN_TRANSIT' ? [{ label: 'Customer has their food', onPress: () => setPrompt({ type: 'delivery', orderNumber: order.orderNumber }) }] : []),
        ]} />
      ))}
      <CodePromptModal
        open={!!prompt.type}
        title={prompt.type === 'pickup' ? 'Pickup code from the cook' : 'Customer delivery code'}
        message={prompt.type === 'pickup' ? 'The cook will give you a code to confirm you collected the food.' : 'Ask the customer for the 5-digit code they received.'}
        placeholder={prompt.type === 'pickup' ? 'Pickup code' : '12345'}
        confirmLabel={prompt.type === 'pickup' ? 'Yes, I have collected the food' : 'Delivery completed'}
        onConfirm={(code) => prompt.type === 'pickup' ? handlePickup(prompt.orderNumber, code) : handleDelivery(prompt.orderNumber, code)}
        onCancel={() => setPrompt({ type: null, orderNumber: '' })}
      />
      <ConfirmModal
        open={!!startConfirm}
        title="Start trip"
        message="You are about to leave the kitchen with the food. The customer will see that you are on your way. Continue?"
        confirmLabel="Yes, start trip"
        onConfirm={() => startConfirm && handleStart(startConfirm)}
        onCancel={() => setStartConfirm(null)}
      />
    </View>
  );
}

function AvailableOrdersPanel({ onError }: { onError: (m: string) => void }) {
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimOrderNumber, setClaimOrderNumber] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { orders } = await fetchAvailableOrders();
      setOrders(orders);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load available orders');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    try {
      const { orders } = await fetchAvailableOrders();
      setOrders(orders);
    } catch {}
  }

  useEffect(() => { load(); }, []);
  useOrderEvents((event) => {
    if (['delivery:open', 'delivery:assigned', 'order:status', 'payment:confirmed', 'payment:proof'].includes(event.type)) {
      refresh();
    }
  });

  async function handleClaim(orderNumber: string) {
    try {
      await claimOrder(orderNumber);
      setClaimOrderNumber(null);
      load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to claim');
    }
  }

  if (loading) return <Loader />;
  if (!orders.length) return <Empty message="No available orders right now." action={{ label: 'Refresh', onPress: load }} />;

  return (
    <View>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} actions={[
          { label: 'Yes, I will deliver this', onPress: () => setClaimOrderNumber(order.orderNumber), primary: true },
        ]} />
      ))}
      <ConfirmModal
        open={!!claimOrderNumber}
        title="Take this delivery"
        message="You are about to promise to pick up this food and take it to the customer. Only claim it if you are ready."
        confirmLabel="Claim delivery"
        onConfirm={() => claimOrderNumber && handleClaim(claimOrderNumber)}
        onCancel={() => setClaimOrderNumber(null)}
      />
    </View>
  );
}

function VerifyPanel({ onError }: { onError: (m: string) => void }) {
  const [orderNumber, setOrderNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit() {
    if (!orderNumber.trim() || !code.trim()) return;
    setLoading(true);
    setSuccess(null);
    try {
      await verifyDeliveryCode(orderNumber.trim(), code.trim());
      setSuccess('Delivery confirmed. Order marked as delivered.');
      setOrderNumber('');
      setCode('');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      {success && (
        <View style={[styles.panel, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
          <Text style={{ color: '#86efac' }}>{success}</Text>
        </View>
      )}
      <Text style={styles.label}>Order number</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} value={orderNumber} onChangeText={setOrderNumber} />
      <Text style={styles.label}>Customer delivery code</Text>
      <TextInput
        style={styles.input}
        placeholder="12345"
        placeholderTextColor={colors.muted}
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 5))}
        keyboardType="number-pad"
        maxLength={5}
      />
      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.primaryButtonText}>Confirm delivery</Text>}
      </TouchableOpacity>
    </View>
  );
}

function EarningsPanel({ onError }: { onError: (m: string) => void }) {
  const [earnings, setEarnings] = useState<RiderEarnings | null>(null);
  const [payouts, setPayouts] = useState<RiderPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [e, p] = await Promise.all([fetchRiderEarnings(), fetchRiderPayouts()]);
      setEarnings(e);
      setPayouts(p.payouts);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    try {
      const [e, p] = await Promise.all([fetchRiderEarnings(), fetchRiderPayouts()]);
      setEarnings(e);
      setPayouts(p.payouts);
    } catch {}
  }

  useEffect(() => { load(); }, []);
  useOrderEvents((event) => {
    if (['delivery:completed', 'payment:confirmed'].includes(event.type)) {
      refresh();
    }
  });

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      await withdrawRiderEarnings();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) return <Loader />;
  if (!earnings) return <Empty message="No earnings data." />;

  return (
    <View>
      <View style={styles.stats}>
        <StatCard label="Total delivered" value={earnings.totalDelivered} />
        <StatCard label="Total earnings" value={earnings.totalEarnings} />
        <StatCard label="Paid out" value={earnings.paidOut} />
        <StatCard label="Pending payout" value={earnings.pendingPayout} />
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={handleWithdraw} disabled={withdrawing}>
        {withdrawing ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.primaryButtonText}>Request withdrawal</Text>}
      </TouchableOpacity>
      {payouts.length > 0 && (
        <View style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Withdrawal requests</Text>
          {payouts.map((p) => (
            <View key={p.id} style={styles.payout}>
              <View style={styles.rowSpace}>
                <Text style={styles.white}>{formatPrice(p.amountKobo)}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{p.status}</Text>
                </View>
              </View>
              <Text style={styles.meta}>{new Date(p.createdAt).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ProfilePanel({
  rider,
  profile,
  setProfile,
  onSave,
  onError,
  onUpdated,
}: {
  rider: Rider;
  profile: { vehicle: string; bankName: string; bankAccountName: string; bankAccountNumber: string };
  setProfile: (p: typeof profile) => void;
  onSave: () => void;
  onError: (m: string) => void;
  onUpdated: (r: Rider) => void;
}) {
  const [upgrading, setUpgrading] = useState(false);
  const [upgrade, setUpgrade] = useState({ documents: '', preferredDate: '', vehicle: '', deliveryMode: 'MOTORCYCLE' });
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  async function submitUpgrade() {
    setUpgradeLoading(true);
    try {
      const { rider: updated } = await applyProfessionalUpgrade({
        documents: upgrade.documents.split('\n').map((d) => d.trim()).filter(Boolean),
        preferredDate: upgrade.preferredDate || undefined,
        vehicle: upgrade.vehicle || undefined,
        deliveryMode: upgrade.deliveryMode,
      });
      onUpdated(updated);
      setUpgrading(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setUpgradeLoading(false);
    }
  }

  return (
    <View>
      <View style={styles.panel}>
        {['vehicle', 'bankName', 'bankAccountName', 'bankAccountNumber'].map((k) => (
          <View key={k}>
            <Text style={styles.label}>
              {k === 'vehicle' ? 'Vehicle type / number' : k === 'bankName' ? 'Bank name' : k === 'bankAccountName' ? 'Account name' : 'Account number'}
            </Text>
            <TextInput
              style={styles.input}
              value={(profile as any)[k]}
              onChangeText={(v) => setProfile({ ...profile, [k]: v })}
              placeholderTextColor={colors.muted}
            />
          </View>
        ))}
        <TouchableOpacity style={styles.primaryButton} onPress={onSave}>
          <Text style={styles.primaryButtonText}>Save profile</Text>
        </TouchableOpacity>
      </View>

      {rider.professionalApproval === 'NOT_APPLIED' && (
        <TouchableOpacity style={[styles.primaryButton, { marginTop: spacing.md }]} onPress={() => setUpgrading(true)}>
          <Text style={styles.primaryButtonText}>Apply to become professional</Text>
        </TouchableOpacity>
      )}

      <Modal visible={upgrading} transparent animationType="fade" onRequestClose={() => setUpgrading(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Professional upgrade</Text>
            <Text style={styles.label}>Document URLs (one per line)</Text>
            <TextInput style={[styles.input, { height: 80 }]} multiline value={upgrade.documents} onChangeText={(v) => setUpgrade({ ...upgrade, documents: v })} placeholderTextColor={colors.muted} />
            <Text style={styles.label}>Vehicle</Text>
            <TextInput style={styles.input} value={upgrade.vehicle} onChangeText={(v) => setUpgrade({ ...upgrade, vehicle: v })} placeholderTextColor={colors.muted} />
            <Text style={styles.label}>Delivery mode</Text>
            <TextInput style={styles.input} value={upgrade.deliveryMode} onChangeText={(v) => setUpgrade({ ...upgrade, deliveryMode: v })} placeholderTextColor={colors.muted} />
            <Text style={styles.label}>Preferred inspection date</Text>
            <TextInput style={styles.input} value={upgrade.preferredDate} onChangeText={(v) => setUpgrade({ ...upgrade, preferredDate: v })} placeholderTextColor={colors.muted} />
            <TouchableOpacity style={styles.primaryButton} onPress={submitUpgrade} disabled={upgradeLoading}>
              {upgradeLoading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.primaryButtonText}>Submit</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setUpgrading(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function OrderCard({ order, actions }: { order: RiderOrder; actions?: { label: string; onPress: () => void; primary?: boolean }[] }) {
  function openMaps(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={styles.orderCard}>
      <View style={styles.rowSpace}>
        <View>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.meta}>{new Date(order.createdAt).toLocaleString()}</Text>
        </View>
        <View style={styles.rowInline}>
          <View style={[styles.badge, { backgroundColor: order.deliveryType === 'PROFESSIONAL' ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)' }]}>
            <Text style={{ color: order.deliveryType === 'PROFESSIONAL' ? '#93c5fd' : '#86efac', fontSize: fontSizes.xs, fontWeight: '700' }}>
              {order.deliveryType === 'PROFESSIONAL' ? 'Professional' : 'Neighborhood'}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{order.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>
      </View>
      <View style={styles.orderBody}>
        <Text style={styles.white}><MapPin size={14} color={colors.brand100} /> {order.cookName || 'Kitchen'} — {order.pickupArea || 'Pickup area'}</Text>
        {order.pickupLocation && (
          <TouchableOpacity onPress={() => openMaps(`https://www.google.com/maps/dir/?api=1&destination=${order.pickupLocation?.lat},${order.pickupLocation?.lng}`)}>
            <Text style={styles.link}><Navigation size={14} color={colors.brand100} /> Navigate to pickup</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => openMaps(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`)}>
          <Text style={styles.link}><Navigation size={14} color={colors.brand100} /> Navigate to dropoff</Text>
        </TouchableOpacity>
        <Text style={styles.white}><Phone size={14} color={colors.brand100} /> {order.phone}</Text>
        <Text style={styles.white}>Total: {order.total}</Text>
        {order.riderFee && <Text style={styles.earningsText}>Rider fee: {order.riderFee}</Text>}
      </View>
      {actions && (
        <View style={styles.actions}>
          {actions.map((a, i) => (
            <TouchableOpacity
              key={i}
              onPress={a.onPress}
              style={[styles.action, a.primary ? { backgroundColor: colors.brand100 } : { backgroundColor: 'rgba(255,255,255,0.1)' }]}
            >
              <Text style={[styles.actionText, a.primary ? { color: colors.brand900 } : { color: colors.white }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CodePromptModal({
  open,
  title,
  message,
  placeholder,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  placeholder: string;
  confirmLabel: string;
  onConfirm: (code: string) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  useEffect(() => { setCode(''); }, [open]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalBody}>{message}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={() => onConfirm(code)}>
            <Text style={styles.primaryButtonText}>{confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalBody}>{message}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={onConfirm}>
            <Text style={styles.primaryButtonText}>{confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Loader() {
  return <ActivityIndicator color={colors.brand100} style={{ marginVertical: spacing.xl }} />;
}

function Empty({ message, action }: { message: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyText}>{message}</Text>
      {action && (
        <TouchableOpacity style={styles.action} onPress={action.onPress}>
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  scroll: { paddingBottom: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800' },
  logout: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full },
  logoutText: { color: colors.muted, fontSize: fontSizes.sm },
  profileCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  profileLeft: { flex: 1, marginRight: spacing.md },
  welcomeBack: { color: colors.muted, fontSize: fontSizes.sm },
  riderName: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800' },
  riderEmail: { color: colors.muted, fontSize: fontSizes.sm, marginBottom: spacing.xs },
  tags: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  balancePill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  balancePillText: { color: '#86efac', fontSize: fontSizes.xs, fontWeight: '700' },
  approvalTag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  approvalTagText: { color: '#93c5fd', fontSize: fontSizes.xs, fontWeight: '700' },
  profileRight: { alignItems: 'flex-end', gap: spacing.sm },
  onlineButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, minWidth: 100 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { color: colors.white, fontWeight: '700' },
  onlineTextActive: { color: colors.brand900, fontWeight: '700' },
  upgrade: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full },
  upgradeText: { color: colors.white, fontSize: fontSizes.sm, fontWeight: '600' },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.2)', padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  errorText: { color: '#fca5a5' },
  tabNav: { flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.md },
  tab: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.sm, minWidth: 70 },
  tabActive: { backgroundColor: colors.brand100 },
  tabText: { color: colors.muted, fontSize: fontSizes.xs, fontWeight: '700', marginTop: spacing.xs },
  tabTextActive: { color: colors.brand900 },
  panel: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md },
  label: { color: colors.muted, marginBottom: spacing.xs, fontSize: fontSizes.sm },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', color: colors.white, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: spacing.md },
  primaryButton: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  primaryButtonText: { color: colors.brand900, fontWeight: '700' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: spacing.md, borderRadius: radii.full, alignItems: 'center', marginTop: spacing.sm },
  secondaryButtonText: { color: colors.white, fontWeight: '700' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1, minWidth: 120, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, alignItems: 'center' },
  statValue: { color: '#86efac', fontSize: fontSizes.xl, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: fontSizes.xs, fontWeight: '700', marginTop: spacing.xs },
  payout: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.sm },
  rowSpace: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowInline: { flexDirection: 'row', gap: spacing.xs },
  sectionTitle: { color: colors.white, fontSize: fontSizes.sm, fontWeight: '700', marginBottom: spacing.sm },
  white: { color: colors.white, marginBottom: spacing.xs },
  meta: { color: colors.muted, fontSize: fontSizes.sm },
  earningsText: { color: '#86efac', marginBottom: spacing.xs },
  orderCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  orderNumber: { color: colors.white, fontWeight: '700' },
  badge: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { color: '#86efac', fontSize: fontSizes.xs, fontWeight: '700' },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  statusBadgeText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700' },
  orderBody: { marginTop: spacing.sm },
  link: { color: colors.brand100, marginBottom: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  action: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full },
  actionText: { fontWeight: '600' },
  emptyPanel: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center', marginVertical: spacing.lg },
  emptyText: { color: colors.muted, textAlign: 'center' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.brand900, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800', marginBottom: spacing.sm },
  modalBody: { color: colors.muted, marginBottom: spacing.md },
  onlineOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.sm },
  onlineOptionActive: { backgroundColor: colors.brand100 },
  onlineOptionText: { flex: 1 },
  onlineOptionLabel: { color: colors.white, fontWeight: '700', fontSize: fontSizes.sm },
  onlineOptionLabelActive: { color: colors.brand900, fontWeight: '700', fontSize: fontSizes.sm },
  onlineOptionSub: { color: colors.muted, fontSize: fontSizes.xs },
});
