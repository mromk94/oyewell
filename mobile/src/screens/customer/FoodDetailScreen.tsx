import React, { useEffect, useState } from 'react';
import { View, Text, Image, ImageBackground, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp, useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { fetchFood, fetchSides, formatPrice, type FoodItem, type FoodOption, type Side } from '../../lib/api';
import { useCart } from '../../lib/cart';
import { ChevronLeft, CheckCircle, ShoppingCart } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { Preloader } from '../../components/Preloader';

export function FoodDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Food'>>();
  const slug = params?.slug;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroHeight = Math.min(height * 0.45, 360);
  const bottomPad = Math.max(insets.bottom, spacing.lg);
  const { addItem, count } = useCart();
  const [food, setFood] = useState<FoodItem | null>(null);
  const [sides, setSides] = useState<Side[]>([]);
  const [selectedOption, setSelectedOption] = useState<FoodOption | null>(null);
  const [selectedSides, setSelectedSides] = useState<Side[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!slug) {
      setError('Missing food slug');
      setLoading(false);
      return;
    }
    Promise.all([fetchFood(slug), fetchSides()])
      .then(([foodData, sidesData]) => {
        setFood(foodData);
        setSides(sidesData.sides.filter((s) => s.isAvailable));
        setSelectedOption(foodData.options.find((o) => o.isAvailable) ?? foodData.options[0] ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load food'))
      .finally(() => setLoading(false));
  }, [slug]);

  function toggleSide(side: Side) {
    setSelectedSides((prev) =>
      prev.find((s) => s.id === side.id) ? prev.filter((s) => s.id !== side.id) : [...prev, side]
    );
  }

  function handleAddToCart() {
    if (!food || !selectedOption || !selectedOption.isAvailable) return;
    if (selectedOption.stock !== null && quantity > selectedOption.stock) return;
    addItem({
      source: 'RESTAURANT',
      foodSlug: food.slug,
      foodName: food.name,
      foodImage: food.heroImage,
      option: selectedOption,
      optionId: selectedOption.id,
      sides: selectedSides,
      sideIds: selectedSides.map((s) => s.id),
      priceKobo: selectedOption.priceKobo,
      quantity,
    });
    setAdded(true);
  }

  if (loading) return <Preloader />;
  if (error || !food) return <Text style={styles.error}>{error ?? 'Not found'}</Text>;

  const canOrder = !!selectedOption && selectedOption.isAvailable && (selectedOption.stock === null || quantity <= selectedOption.stock);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 110 }}>
        <View style={[styles.hero, { height: heroHeight }]}>
          {food.heroImage ? (
            <ImageBackground source={{ uri: food.heroImage }} style={styles.image} resizeMode="cover" imageStyle={{ backgroundColor: colors.brand800 }}>
              <View style={styles.heroOverlay} />
            </ImageBackground>
          ) : (
            <View style={[styles.image, styles.placeholder]} />
          )}
          <TouchableOpacity style={[styles.back, { top: insets.top + spacing.sm }]} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.white} />
            <Text style={styles.backText}>Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cart, { top: insets.top + spacing.sm }]} onPress={() => navigation.navigate('Cart')}
          >
            <ShoppingCart size={20} color={colors.white} />
            {count > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeCount}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{food.name}</Text>
          <View style={[styles.badge, { backgroundColor: food.isAvailable ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }]}>
            <Text style={[styles.badgeText, { color: food.isAvailable ? '#86efac' : '#fca5a5' }]}>
              {food.isAvailable ? 'Available today' : 'Currently unavailable'}
            </Text>
          </View>
          <Text style={styles.description}>{food.description}</Text>

          <Text style={styles.section}>Choose an option</Text>
          {food.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.option, selectedOption?.id === option.id && styles.optionActive, !option.isAvailable && styles.optionDisabled]}
              onPress={() => option.isAvailable && setSelectedOption(option)}
              activeOpacity={option.isAvailable ? 0.7 : 1}
            >
              <View style={styles.optionMain}>
                <Text style={[styles.optionText, !option.isAvailable && styles.optionTextDisabled]} numberOfLines={2}>{option.label}</Text>
                {option.stock !== null && <Text style={styles.optionStock}>{option.stock} left</Text>}
              </View>
              <Text style={styles.optionPrice} numberOfLines={1}>{formatPrice(option.priceKobo)}</Text>
            </TouchableOpacity>
          ))}

          {sides.length > 0 && (
            <>
              <Text style={styles.section}>Add sides</Text>
              {sides.map((side) => (
                <TouchableOpacity key={side.id} style={[styles.side, selectedSides.find((s) => s.id === side.id) && styles.sideActive]} onPress={() => toggleSide(side)}>
                  <Text style={styles.sideText}>{side.name} — {formatPrice(side.priceKobo)}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          <View style={styles.quantity}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.quantityPill}>
              <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyButton} disabled={quantity <= 1}>
                <Text style={[styles.qtyText, quantity <= 1 && styles.qtyTextDisabled]}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyCount}>{quantity}</Text>
              <TouchableOpacity
                onPress={() =>
                  setQuantity((q) =>
                    selectedOption && (selectedOption.stock === null || q < selectedOption.stock) ? q + 1 : q
                  )
                }
                style={styles.qtyButton}
                disabled={selectedOption !== null && selectedOption.stock !== null && quantity >= selectedOption.stock}
              >
                <Text style={[styles.qtyText, selectedOption !== null && selectedOption.stock !== null && quantity >= selectedOption.stock && styles.qtyTextDisabled]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { bottom: bottomPad + spacing.md }]}>
        {added ? (
          <TouchableOpacity style={styles.added} onPress={() => navigation.navigate('Cart')}>
            <CheckCircle size={20} color={colors.success} />
            <Text style={styles.addedText}>Added — view cart</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.addButton, !canOrder && styles.addButtonDisabled]} onPress={handleAddToCart} activeOpacity={0.8} disabled={!canOrder}>
            <Text style={styles.addText}>Order now — {formatPrice(((selectedOption?.priceKobo ?? 0) * quantity) + selectedSides.reduce((s, x) => s + x.priceKobo * quantity, 0))}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.md },
  hero: { position: 'relative', width: '100%' },
  image: { width: '100%', height: '100%', backgroundColor: colors.brand800 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  placeholder: { backgroundColor: colors.brand900 },
  back: { position: 'absolute', left: spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: spacing.sm, borderRadius: radii.full },
  backText: { color: colors.white, fontSize: fontSizes.sm, fontWeight: '600', marginLeft: -spacing.xs },
  cart: { position: 'absolute', right: spacing.md, backgroundColor: 'rgba(0,0,0,0.4)', padding: spacing.sm, borderRadius: radii.full, justifyContent: 'center', alignItems: 'center' },
  badgeDot: { position: 'absolute', top: -6, right: -6, backgroundColor: colors.success, minWidth: 20, height: 20, borderRadius: 999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeCount: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '800' },
  body: { padding: spacing.lg, marginTop: -spacing.xxl },
  name: { color: colors.white, fontSize: fontSizes.hero, fontWeight: '800', marginBottom: spacing.sm },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, marginBottom: spacing.md },
  badgeText: { fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { color: colors.muted, fontSize: fontSizes.lg, marginBottom: spacing.md, lineHeight: 26 },
  section: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.md, borderRadius: radii.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  optionActive: { borderColor: colors.success, backgroundColor: 'rgba(34,197,94,0.08)' },
  optionDisabled: { opacity: 0.5 },
  optionMain: { flex: 1, marginRight: spacing.md },
  optionText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '600' },
  optionTextDisabled: { color: colors.muted },
  optionStock: { color: colors.muted, fontSize: fontSizes.sm, marginTop: spacing.xs },
  optionPrice: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700', flexShrink: 0 },
  side: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: spacing.sm },
  sideActive: { borderColor: colors.success, backgroundColor: 'rgba(34,197,94,0.08)' },
  sideText: { color: colors.white, fontSize: fontSizes.base },
  quantity: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.lg },
  quantityLabel: { color: colors.white, fontSize: fontSizes.base, fontWeight: '600' },
  quantityPill: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.xs },
  qtyButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  qtyText: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700' },
  qtyTextDisabled: { color: colors.muted },
  qtyCount: { color: colors.white, fontSize: fontSizes.xl, minWidth: 40, textAlign: 'center' },
  footer: { position: 'absolute', left: spacing.md, right: spacing.md, backgroundColor: colors.brand900, paddingTop: spacing.md },
  addButton: { backgroundColor: colors.white, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  addButtonDisabled: { opacity: 0.5 },
  addText: { color: colors.brand900, fontWeight: '800', fontSize: fontSizes.base },
  added: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(34,197,94,0.1)', padding: spacing.md, borderRadius: radii.full },
  addedText: { color: colors.success, fontSize: fontSizes.base, fontWeight: '700' },
});
