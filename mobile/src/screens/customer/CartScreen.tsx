import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useCart } from '../../lib/cart';
import { useAuth } from '../../lib/auth';
import { formatPrice, createOrder, fetchPaymentMethods, verifyPayment, checkDelivery, type CartItemPayload, type PaymentMethod, type DeliveryResult } from '../../lib/api';
import { getCurrentAddress } from '../../lib/location';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { ShoppingCart } from 'lucide-react-native';

const MANUAL_PROVIDERS = new Set(['BANK_TRANSFER', 'CRYPTO']);

export function CartScreen() {
  const { items, totalKobo, count, updateQuantity, removeItem, clear } = useCart();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<'NEIGHBORHOOD' | 'PROFESSIONAL'>('NEIGHBORHOOD');
  const [deliveryOptions, setDeliveryOptions] = useState<{ NEIGHBORHOOD?: DeliveryResult; PROFESSIONAL?: DeliveryResult }>({});
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  useEffect(() => {
    fetchPaymentMethods()
      .then(({ methods }) => {
        setMethods(methods.filter((m) => m.enabled));
        if (methods.length > 0) setSelectedMethodId(methods[0].id);
      })
      .catch(() => setMethods([]));
  }, []);

  useEffect(() => {
    if (!address.trim() || items.length === 0) {
      setDeliveryOptions({});
      return;
    }
    setDeliveryLoading(true);
    const payload = {
      address: address.trim(),
      phone: phone.trim() || '0000',
      items: items.map((item) => ({
        foodSlug: item.foodSlug,
        optionId: item.optionId ?? item.option?.id,
        quantity: item.quantity,
        sideIds: item.sideIds ?? item.sides?.map((s) => s.id),
        cookListingId: item.cookListingId,
      })),
      lat,
      lng,
    };
    Promise.all([
      checkDelivery({ ...payload, deliveryType: 'NEIGHBORHOOD' }).catch(() => undefined),
      checkDelivery({ ...payload, deliveryType: 'PROFESSIONAL' }).catch(() => undefined),
    ])
      .then(([n, p]) => setDeliveryOptions({ NEIGHBORHOOD: n, PROFESSIONAL: p }))
      .finally(() => setDeliveryLoading(false));
  }, [address, phone, items, lat, lng]);

  async function detectLocation() {
    setLoading(true);
    try {
      const result = await getCurrentAddress();
      if (result) {
        setAddress(result.address);
        setLat(result.lat);
        setLng(result.lng);
      } else {
        setError('Location permission denied');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Location lookup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!user) {
      navigation.navigate('Auth', { mode: 'signin', next: 'Cart' });
      return;
    }
    if (!address || !phone) {
      setError('Address and phone are required');
      return;
    }
    const method = methods.find((m) => m.id === selectedMethodId);
    if (!method) {
      setError('Select a payment method');
      return;
    }
    const mixed = items.some((i) => i.source !== items[0].source);
    if (mixed) {
      setError('Cannot mix restaurant and cook orders in one checkout.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cartItems: CartItemPayload[] = items.map((item) => ({
        foodSlug: item.foodSlug,
        optionId: item.optionId ?? item.option?.id,
        quantity: item.quantity,
        sideIds: item.sideIds ?? item.sides?.map((s) => s.id),
        cookListingId: item.cookListingId,
      }));
      const selectedDelivery = deliveryOptions[deliveryType];
      const { order, payment } = await createOrder({
        address,
        phone,
        items: cartItems,
        source: items[0].source,
        deliveryType,
        paymentProvider: method.provider,
        paymentCurrency: method.currency,
        lat: selectedDelivery?.lat ?? lat,
        lng: selectedDelivery?.lng ?? lng,
      });
      clear();
      if (MANUAL_PROVIDERS.has(payment.provider)) {
        navigation.navigate('PaymentProof', { paymentId: payment.id, orderNumber: order.orderNumber, instructions: method.config?.instructions ?? '' });
      } else {
        if (payment.idempotencyKey) {
          try {
            await verifyPayment(payment.id, payment.idempotencyKey);
          } catch {
            // fall through to Track even if verify fails; server side will reconcile
          }
        }
        navigation.reset({ index: 1, routes: [{ name: 'MainTabs' }, { name: 'Track', params: { orderNumber: order.orderNumber } }] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  const empty = count === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Cart</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <ShoppingCart size={48} color={colors.muted} />
            <Text style={styles.empty}>Your cart is empty.</Text>
            <TouchableOpacity style={styles.continue} onPress={() => navigation.goBack()}>
              <Text style={styles.continueText}>Continue browsing</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            {item.foodImage ? (
              <Image source={{ uri: item.foodImage }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
            <View style={styles.itemBody}>
              <View style={styles.row}>
                <Text style={styles.name} numberOfLines={2}>{item.foodName ?? item.cookName}</Text>
                <Text style={styles.price}>{formatPrice(item.priceKobo * item.quantity)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.source}>{item.source === 'COOK' ? `By ${item.cookName}` : 'Restaurant'}</Text>
                {item.option && <Text style={styles.meta}>{item.option.label}</Text>}
                {item.sides && item.sides.length > 0 && <Text style={styles.meta}>+ {item.sides.map((s) => s.name).join(', ')}</Text>}
              </View>
              <View style={styles.row}>
                <View style={styles.qty}>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1)} style={styles.qtyButton}>
                    <Text style={styles.qtyText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyCount}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)} style={styles.qtyButton}>
                    <Text style={styles.qtyText}>+</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Text style={styles.remove}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={!empty ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <TextInput
            style={styles.input}
            placeholder="Delivery address"
            placeholderTextColor={colors.muted}
            value={address}
            onChangeText={setAddress}
          />
          <TouchableOpacity style={styles.locationButton} onPress={detectLocation} disabled={loading}>
            <Text style={styles.locationButtonText}>Use my current location</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.section}>Payment method</Text>
          <FlatList
            data={methods}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.methodList}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.emptyMethod}>No payment methods available.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.method, selectedMethodId === item.id && styles.methodSelected]}
                onPress={() => setSelectedMethodId(item.id)}
              >
                <Text style={styles.methodName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />

          <Text style={styles.section}>Delivery</Text>
          <View style={styles.deliveryRow}>
            {(['NEIGHBORHOOD', 'PROFESSIONAL'] as const).map((t) => {
              const opt = deliveryOptions[t];
              const selected = deliveryType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.deliveryOption, selected && styles.deliveryOptionSelected]}
                  onPress={() => setDeliveryType(t)}
                >
                  <Text style={[styles.deliveryLabel, selected && styles.deliveryLabelSelected]}>
                    {t === 'NEIGHBORHOOD' ? 'Neighborhood' : 'Professional'}
                  </Text>
                  <Text style={styles.deliveryFee}>
                    {opt?.available ? formatPrice(opt.deliveryFeeKobo) : deliveryLoading ? '…' : '—'}
                  </Text>
                  {opt?.estimatedMinutes ? (
                    <Text style={styles.deliveryEta}>{opt.estimatedMinutes} min</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          {(() => {
            const opt = deliveryOptions[deliveryType];
            const platformFee = opt?.available ? opt.platformFee : null;
            const deliveryFee = opt?.available ? opt.deliveryFee : null;
            const grand = opt?.available ? opt.total : formatPrice(totalKobo);
            return (
              <View style={styles.summary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{formatPrice(totalKobo)}</Text>
                </View>
                {platformFee && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Platform fee</Text>
                    <Text style={styles.summaryValue}>{platformFee}</Text>
                  </View>
                )}
                {deliveryFee && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery</Text>
                    <Text style={styles.summaryValue}>{deliveryFee}</Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{grand}</Text>
                </View>
              </View>
            );
          })()}

          <TouchableOpacity style={styles.checkout} onPress={handleCheckout} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.checkoutText}>{user ? 'Checkout' : 'Sign in to place order'}</Text>}
        </TouchableOpacity>
        </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.md },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  continue: { backgroundColor: colors.brand100, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.full },
  continueText: { color: colors.brand900, fontWeight: '700' },
  item: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radii.md, backgroundColor: colors.brand900 },
  thumbPlaceholder: { backgroundColor: colors.brand900 },
  itemBody: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  name: { color: colors.white, fontSize: fontSizes.base, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  price: { color: colors.brand100, fontWeight: '700' },
  source: { color: colors.muted, fontSize: fontSizes.sm },
  meta: { color: colors.muted, fontSize: fontSizes.sm, flex: 1, textAlign: 'right' },
  qty: { flexDirection: 'row', alignItems: 'center' },
  qtyButton: { backgroundColor: colors.brand900, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.md },
  qtyText: { color: colors.white },
  qtyCount: { color: colors.white, marginHorizontal: spacing.md },
  remove: { color: colors.danger, fontSize: fontSizes.sm },
  footer: { paddingTop: spacing.md },
  input: { backgroundColor: colors.brand800, color: colors.white, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  locationButton: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.full, alignItems: 'center', marginBottom: spacing.md },
  locationButtonText: { color: colors.brand100, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  totalLabel: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '600' },
  totalValue: { color: colors.brand100, fontSize: fontSizes.lg, fontWeight: '700' },
  checkout: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  checkoutText: { color: colors.brand900, fontWeight: '700' },
  section: { color: colors.white, fontSize: fontSizes.base, fontWeight: '600', marginBottom: spacing.sm },
  methodList: { paddingBottom: spacing.md },
  emptyMethod: { color: colors.muted, marginBottom: spacing.md },
  method: { backgroundColor: colors.brand800, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, marginRight: spacing.sm, minWidth: 100, alignItems: 'center' },
  methodSelected: { backgroundColor: colors.brand100 },
  methodName: { color: colors.muted, fontWeight: '600' },
  deliveryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  deliveryOption: { flex: 1, backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: 'transparent' },
  deliveryOptionSelected: { borderColor: colors.brand100 },
  deliveryLabel: { color: colors.white, fontWeight: '600', marginBottom: spacing.xs },
  deliveryLabelSelected: { color: colors.brand100 },
  deliveryFee: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  deliveryEta: { color: colors.muted, fontSize: fontSizes.xs, marginTop: spacing.xs },
  summary: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  summaryLabel: { color: colors.muted, fontSize: fontSizes.sm },
  summaryValue: { color: colors.white, fontSize: fontSizes.sm },
});
