import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useCart } from '../../lib/cart';
import { useAuth } from '../../lib/auth';
import { formatPrice, createOrder, fetchPaymentMethods, type CartItemPayload, type PaymentMethod } from '../../lib/api';
import { getCurrentAddress } from '../../lib/location';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const MANUAL_PROVIDERS = new Set(['BANK_TRANSFER', 'CRYPTO']);

export function CartScreen() {
  const { items, totalKobo, count, updateQuantity, removeItem, clear } = useCart();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentMethods()
      .then(({ methods }) => {
        setMethods(methods.filter((m) => m.enabled));
        if (methods.length > 0) setSelectedMethodId(methods[0].id);
      })
      .catch(() => setMethods([]));
  }, []);

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
    if (!address || !phone) {
      setError('Address and phone are required');
      return;
    }
    const method = methods.find((m) => m.id === selectedMethodId);
    if (!method) {
      setError('Select a payment method');
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
      const { order, payment } = await createOrder({
        address,
        phone,
        items: cartItems,
        source: 'RESTAURANT',
        paymentProvider: method.provider,
        paymentCurrency: method.currency,
        lat,
        lng,
      });
      clear();
      if (MANUAL_PROVIDERS.has(payment.provider)) {
        navigation.navigate('PaymentProof', { paymentId: payment.id, orderNumber: order.orderNumber, instructions: method.config?.instructions ?? '' });
      } else {
        navigation.navigate('Track', { orderNumber: order.orderNumber });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  if (count === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.title}>Cart</Text>
        <Text style={styles.empty}>Your cart is empty.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Cart</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>{item.foodName ?? item.cookName}</Text>
              <Text style={styles.price}>{formatPrice(item.priceKobo * item.quantity)}</Text>
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
        )}
      />

      <View style={styles.footer}>
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

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(totalKobo)}</Text>
        </View>

        <TouchableOpacity style={styles.checkout} onPress={handleCheckout} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.checkoutText}>Checkout</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.md },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  list: { paddingBottom: spacing.md },
  item: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  name: { color: colors.white, fontSize: fontSizes.base, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  price: { color: colors.brand100 },
  qty: { flexDirection: 'row', alignItems: 'center' },
  qtyButton: { backgroundColor: colors.brand900, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.md },
  qtyText: { color: colors.white },
  qtyCount: { color: colors.white, marginHorizontal: spacing.md },
  remove: { color: colors.danger },
  footer: { marginTop: 'auto' },
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
});
