import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useCart } from '../../lib/cart';
import { useAuth } from '../../lib/auth';
import { formatPrice, createOrder, type CartItemPayload } from '../../lib/api';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export function CartScreen() {
  const { items, totalKobo, count, updateQuantity, removeItem, clear } = useCart();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (!address || !phone) {
      setError('Address and phone are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cartItems: CartItemPayload[] = items.map((item) => ({
        foodSlug: item.foodSlug,
        optionId: item.option?.id,
        quantity: item.quantity,
        sideIds: item.sides?.map((s) => s.id),
        cookListingId: item.cookListingId,
      }));
      const { order } = await createOrder({ address, phone, items: cartItems });
      clear();
      navigation.navigate('Track', { orderNumber: order.orderNumber });
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
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          placeholderTextColor={colors.muted}
          value={phone}
          onChangeText={setPhone}
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
  error: { color: colors.danger, marginBottom: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  totalLabel: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '600' },
  totalValue: { color: colors.brand100, fontSize: fontSizes.lg, fontWeight: '700' },
  checkout: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  checkoutText: { color: colors.brand900, fontWeight: '700' },
});
