import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, type RouteProp, useNavigation, type NavigationProp, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { fetchOrder, formatPrice, createReview, uploadPaymentProof, type OrderSummary } from '../../lib/api';
import { useInterval } from '../../lib/polling';
import { useAuth } from '../../lib/auth';
import { pickImage } from '../../lib/imagePicker';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { Star, ChevronLeft, Package, CheckCircle, XCircle, Clock, Truck, Home, Utensils, Upload, Flag, UserPlus, Check } from 'lucide-react-native';

const TRACK_STATUSES = [
  { key: 'PENDING_PAYMENT', label: 'Order placed', description: 'We received your order and are waiting for payment confirmation.', Icon: Package },
  { key: 'PAID', label: 'Payment confirmed', description: 'Your payment has been verified. The kitchen is getting ready.', Icon: CheckCircle },
  { key: 'CONFIRMED', label: 'Confirmed', description: 'Your order has been accepted and will start preparing soon.', Icon: Utensils },
  { key: 'COOK_ACCEPTED', label: 'Cook accepted', description: 'The cook has accepted your order and will start preparing it.', Icon: Utensils },
  { key: 'PREPARING', label: 'Preparing', description: 'Your food is being cooked and packed right now.', Icon: Utensils },
  { key: 'READY_FOR_PICKUP', label: 'Ready for pickup', description: 'Your order is packed and waiting for a delivery rider.', Icon: Package },
  { key: 'READY_FOR_DISPATCH', label: 'Ready for dispatch', description: 'Your order is packed and waiting for the delivery rider.', Icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', description: 'A rider is on the way to the kitchen.', Icon: Truck },
  { key: 'PICKED_UP', label: 'Picked up', description: 'The rider has collected your order and is heading to you.', Icon: Truck },
  { key: 'IN_TRANSIT', label: 'On the way', description: 'The rider is on the way to your location.', Icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', description: 'Your order has arrived. Enjoy your meal!', Icon: Home },
];

function isManualPayment(provider?: string | null) {
  return provider === 'BANK_TRANSFER' || provider === 'CRYPTO';
}

export function TrackOrderScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Track'>>();
  const orderNumber = route.params?.orderNumber;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, register } = useAuth();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [registering, setRegistering] = useState(false);
  const MAX_PROOF_LENGTH = 2_000_000;

  function load(silent = false) {
    if (!orderNumber) {
      setError('No order number provided');
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    fetchOrder(orderNumber)
      .then(({ order }) => setOrder(order))
      .catch((e) => setError(e instanceof Error ? e.message : 'Order not found'))
      .finally(() => { if (!silent) setLoading(false); });
  }

  useEffect(() => { load(); }, [orderNumber]);
  useFocusEffect(React.useCallback(() => { load(true); }, [orderNumber]));
  useInterval(() => load(true), 15000);

  async function handlePickProof() {
    const picked = await pickImage();
    if (!picked) return;
    if (picked.length > MAX_PROOF_LENGTH) {
      setError('Image is too large. Choose a smaller file.');
      return;
    }
    setError(null);
    setProofImage(picked);
  }

  async function handleUploadProof() {
    if (!proofImage || !order?.payment) return;
    setUploading(true);
    try {
      setError(null);
      await uploadPaymentProof(order.payment.id, proofImage, '');
      setProofImage(null);
      setJustUploaded(true);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleReview() {
    if (!order?.cookId || !rating) return;
    setSubmittingReview(true);
    try {
      await createReview({ orderNumber, rating, comment, target: 'cook' });
      setSubmittedReview(true);
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleRegister() {
    if (!order) return;
    setError(null);
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!accepted) {
      setError('Please accept the Terms of Service to continue.');
      return;
    }
    setRegistering(true);
    try {
      await register({
        email: email.trim(),
        password,
        firstName: 'OYE',
        lastName: 'Customer',
        phone: order.phone ?? '',
      });
      setEmail('');
      setPassword('');
      setConfirm('');
      setAccepted(false);
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setRegistering(false);
    }
  }

  if (loading) return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ActivityIndicator color={colors.brand100} style={styles.loader} />
    </SafeAreaView>
  );

  if (error || !order) return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.error}>{error ?? 'Order not found'}</Text>
      <TouchableOpacity onPress={() => navigation.navigate('MainTabs')}>
        <Text style={styles.link}>Back to menu</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const currentIndex = TRACK_STATUSES.findIndex((s) => s.key === order.status);
  const manual = isManualPayment(order.payment?.provider);
  const proofUrl = order.payment?.attempts?.[0]?.payload?.image as string | undefined;
  const needsOnboarding = !user && (order.paymentStatus === 'PAID' || order.paymentStatus === 'PENDING' || justUploaded);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <ChevronLeft size={24} color={colors.white} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.title}>Order {order.orderNumber}</Text>
        <View style={styles.subTitleRow}>
          <View style={[styles.badge, order.deliveryType === 'PROFESSIONAL' ? styles.badgePro : styles.badgeNeigh]}>
            <Text style={[styles.badgeText, order.deliveryType === 'PROFESSIONAL' ? styles.badgeTextPro : styles.badgeTextNeigh]}>
              {order.deliveryType === 'PROFESSIONAL' ? 'Professional' : 'Neighborhood'} delivery
            </Text>
          </View>
          <Text style={styles.status}>{order.status.replace(/_/g, ' ')}</Text>
        </View>

        {order.payment && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.section}>Payment</Text>
              <StatusPill status={order.paymentStatus} />
            </View>
            <Text style={styles.body}>{order.payment.provider}</Text>

            {manual && (order.paymentStatus === 'PENDING' || order.paymentStatus === 'UNDER_REVIEW') && (
              <View style={styles.manualBox}>
                {(proofUrl || justUploaded) ? (
                  <View>
                    <ActivityIndicator color={'#bfdbfe'} style={{ marginBottom: spacing.sm }} />
                    <Text style={styles.manualText}>Proof uploaded. Awaiting verification by the restaurant.</Text>
                    {proofUrl && <Image source={{ uri: proofUrl }} style={styles.proofImage} resizeMode="cover" />}
                  </View>
                ) : (
                  <View>
                    {order.payment.method ? (
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodLabel}>Pay to: {order.payment.method.name}</Text>
                        {order.payment.method.provider === 'BANK_TRANSFER' ? (
                          <View>
                            {order.payment.method.config?.bankName && (
                              <Text style={styles.methodText}>Bank: {order.payment.method.config.bankName}</Text>
                            )}
                            {order.payment.method.config?.accountName && (
                              <Text style={styles.methodText}>Account name: {order.payment.method.config.accountName}</Text>
                            )}
                            {order.payment.method.publicKey && (
                              <Text style={styles.methodText}>Account number: {order.payment.method.publicKey}</Text>
                            )}
                            {order.payment.method.config?.instructions && (
                              <Text style={styles.methodInstructions}>{order.payment.method.config.instructions}</Text>
                            )}
                          </View>
                        ) : order.payment.method.provider === 'CRYPTO' ? (
                          <View>
                            <Text style={styles.methodText}>Network: {order.payment.method.config?.network ?? '-'}</Text>
                            <Text style={styles.methodText}>Wallet: {order.payment.method.publicKey ?? '-'}</Text>
                            {order.payment.method.config?.instructions && (
                              <Text style={styles.methodInstructions}>{order.payment.method.config.instructions}</Text>
                            )}
                          </View>
                        ) : (
                          <Text style={styles.methodInstructions}>
                            Use the selected payment method to complete your order. Send the payment and upload a screenshot or receipt.
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.methodInstructions}>
                        Send the payment and upload a screenshot or receipt. Your order will be confirmed once we verify the payment.
                      </Text>
                    )}
                    <TouchableOpacity style={styles.imageButton} onPress={handlePickProof}>
                      <Text style={styles.imageButtonText}>{proofImage ? 'Change image' : 'Select proof image'}</Text>
                    </TouchableOpacity>
                    {proofImage && <Image source={{ uri: proofImage }} style={styles.proofImage} resizeMode="cover" />}
                    <TouchableOpacity style={styles.uploadButton} onPress={handleUploadProof} disabled={!proofImage || uploading}>
                      {uploading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.uploadButtonText}>Upload proof</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {order.paymentStatus === 'PAID' && (
              <Text style={styles.body}>Your payment has been confirmed.</Text>
            )}

            {order.deliveryCode && order.paymentStatus === 'PAID' && (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Show this code to the delivery rider</Text>
                <Text style={styles.code}>{order.deliveryCode}</Text>
              </View>
            )}
          </View>
        )}

        {needsOnboarding && (
          <View style={[styles.card, styles.onboardingCard]}>
            <View style={styles.onboardingHeader}>
              <View style={styles.userPlusIcon}>
                <UserPlus size={20} color={colors.brand900} />
              </View>
              <Text style={styles.section}>Create your tracking account</Text>
            </View>
            <Text style={styles.onboardingBody}>
              Create a free account to make tracking this order easy and safe. You will always be able to look up your order history and receive updates.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email (username)"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirm password"
                placeholderTextColor={colors.muted}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />
            </View>
            <TouchableOpacity style={styles.termsRow} onPress={() => setAccepted((s) => !s)}>
              <View style={[styles.checkBox, accepted && styles.checkBoxActive]}>
                {accepted && <Check size={14} color={colors.brand900} />}
              </View>
              <Text style={styles.termsText}>I agree to the Terms of Service and understand this keeps my order safe and easy to track.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.onboardingButton} onPress={handleRegister} disabled={registering}>
              {registering ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.onboardingButtonText}>Create account & continue</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.section}>Items</Text>
          {order.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.foodName}</Text>
                <Text style={styles.itemMeta}>{item.optionLabel} × {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatPrice(item.totalKobo)}</Text>
            </View>
          ))}
          {order.sides.length > 0 && <View style={styles.divider} />}
          {order.sides.map((side, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>+ {side.name}</Text>
                <Text style={styles.itemMeta}>× {side.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatPrice(side.totalKobo)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{order.subtotal}</Text>
          </View>
          {!!order.platformFee && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform fee</Text>
              <Text style={styles.summaryValue}>{order.platformFee}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.summaryValue}>{order.deliveryFee}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: spacing.sm }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{order.total}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Delivery</Text>
          <Text style={styles.body}>{order.status === 'DELIVERED' ? order.address : order.approximateArea}</Text>
          <Text style={styles.body}>{order.status === 'DELIVERED' ? order.phone : order.phone.replace(/.(?=.{4})/g, '*')}</Text>
          {order.riderId && (
            <TouchableOpacity style={styles.reportRow}>
              <Flag size={16} color={colors.danger} />
              <Text style={styles.reportText}>Report rider</Text>
            </TouchableOpacity>
          )}
        </View>

        {order.status === 'DELIVERED' && order.cookId && user && !submittedReview && (
          <View style={styles.card}>
            <Text style={styles.section}>Rate your cook</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Star size={32} color={n <= rating ? '#fbbf24' : colors.muted} fill={n <= rating ? '#fbbf24' : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share a few words (optional)"
              placeholderTextColor={colors.muted}
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <TouchableOpacity style={styles.reviewButton} onPress={handleReview} disabled={!rating || submittingReview}>
              {submittingReview ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.reviewButtonText}>Submit review</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.section}>Tracking</Text>
          <View style={styles.timeline}>
            {TRACK_STATUSES.map((status, i) => {
              const done = i <= currentIndex;
              const active = i === currentIndex;
              const Icon = status.Icon;
              return (
                <View key={status.key} style={styles.timelineItem}>
                  <View style={[styles.dot, done ? styles.dotDone : styles.dotPending, active && styles.dotActive]}>
                    <Icon size={18} color={done ? colors.brand900 : colors.muted} />
                  </View>
                  <View style={styles.timelineText}>
                    <Text style={[styles.timelineLabel, active ? styles.timelineLabelActive : done ? styles.timelineLabelDone : styles.timelineLabelPending]}>{status.label}</Text>
                    <Text style={[styles.timelineDesc, active ? styles.timelineDescActive : done ? styles.timelineDescDone : styles.timelineDescPending]}>{status.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'PAID') return <View style={styles.pill}><CheckCircle size={14} color={colors.success} /><Text style={[styles.pillText, { color: colors.success }]}>Paid</Text></View>;
  if (status === 'FAILED') return <View style={styles.pill}><XCircle size={14} color={colors.danger} /><Text style={[styles.pillText, { color: colors.danger }]}>Rejected</Text></View>;
  if (status === 'UNDER_REVIEW') return <View style={styles.pill}><Clock size={14} color={colors.warning} /><Text style={[styles.pillText, { color: colors.warning }]}>Under review</Text></View>;
  return <View style={styles.pill}><Clock size={14} color={colors.warning} /><Text style={[styles.pillText, { color: colors.warning }]}>Pending</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.md },
  link: { color: colors.brand100, textAlign: 'center', marginTop: spacing.md },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  backText: { color: colors.white, marginLeft: spacing.xs },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800', marginBottom: spacing.sm },
  subTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.full },
  badgePro: { backgroundColor: 'rgba(59,130,246,0.2)' },
  badgeNeigh: { backgroundColor: 'rgba(16,185,129,0.2)' },
  badgeText: { fontSize: fontSizes.xs, fontWeight: '700' },
  badgeTextPro: { color: '#93c5fd' },
  badgeTextNeigh: { color: '#6ee7b7' },
  status: { color: colors.muted, fontSize: fontSizes.base },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  section: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700' },
  body: { color: colors.muted, marginTop: spacing.xs },
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.full },
  pillText: { fontSize: fontSizes.sm, fontWeight: '700' },
  manualBox: { backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: radii.lg, padding: spacing.md, marginTop: spacing.sm },
  manualText: { color: '#bfdbfe', textAlign: 'center' },
  methodInfo: { marginBottom: spacing.md },
  methodLabel: { color: colors.white, fontWeight: '700' },
  methodText: { color: colors.muted, marginTop: spacing.xs },
  methodInstructions: { color: '#bfdbfe', marginTop: spacing.sm },
  imageButton: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, alignItems: 'center', marginTop: spacing.md },
  imageButtonText: { color: colors.brand100, fontWeight: '600' },
  proofImage: { width: '100%', height: 180, borderRadius: radii.lg, marginTop: spacing.md, backgroundColor: colors.brand800 },
  uploadButton: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center', marginTop: spacing.md },
  uploadButtonText: { color: colors.brand900, fontWeight: '700' },
  codeBox: { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: radii.lg, padding: spacing.md, marginTop: spacing.md, alignItems: 'center' },
  codeLabel: { color: '#a7f3d0', marginBottom: spacing.xs },
  code: { color: '#6ee7b7', fontSize: fontSizes.hero, fontWeight: '800', letterSpacing: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  itemName: { color: colors.white, fontWeight: '600' },
  itemMeta: { color: colors.muted, fontSize: fontSizes.sm },
  itemPrice: { color: colors.brand100, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  summaryLabel: { color: colors.muted, fontSize: fontSizes.sm },
  summaryValue: { color: colors.white, fontSize: fontSizes.sm },
  totalLabel: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700' },
  totalValue: { color: colors.brand100, fontSize: fontSizes.lg, fontWeight: '700' },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  reportText: { color: colors.danger, fontSize: fontSizes.sm },
  stars: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  reviewInput: { backgroundColor: colors.brand800, color: colors.white, padding: spacing.md, borderRadius: radii.lg, minHeight: 80, marginBottom: spacing.md },
  reviewButton: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  reviewButtonText: { color: colors.brand900, fontWeight: '700' },
  timeline: { marginTop: spacing.sm },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  dot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginRight: spacing.md },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotPending: { backgroundColor: colors.brand900, borderColor: 'rgba(255,255,255,0.2)' },
  dotActive: { shadowColor: colors.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8 },
  timelineText: { flex: 1 },
  timelineLabel: { fontSize: fontSizes.base, fontWeight: '700' },
  timelineLabelActive: { color: colors.white },
  timelineLabelDone: { color: colors.white },
  timelineLabelPending: { color: colors.muted },
  timelineDesc: { fontSize: fontSizes.sm, marginTop: spacing.xs },
  timelineDescActive: { color: colors.brand100 },
  timelineDescDone: { color: colors.muted },
  timelineDescPending: { color: 'rgba(255,255,255,0.4)' },
  onboardingCard: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  onboardingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  userPlusIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  onboardingBody: { color: '#a7f3d0', marginBottom: spacing.md, lineHeight: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', color: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  passwordRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  checkBox: { width: 20, height: 20, borderRadius: radii.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginTop: spacing.xs },
  checkBoxActive: { backgroundColor: colors.white, borderColor: colors.white },
  termsText: { color: 'rgba(255,255,255,0.7)', fontSize: fontSizes.sm, flex: 1, lineHeight: 18 },
  onboardingButton: { backgroundColor: colors.success, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  onboardingButtonText: { color: colors.brand900, fontWeight: '700' },
});
