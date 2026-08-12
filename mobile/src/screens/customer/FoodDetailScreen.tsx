import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { fetchFood, fetchSides, formatPrice, type FoodItem, type FoodOption, type Side } from '../../lib/api';
import { useCart } from '../../lib/cart';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export function FoodDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Food'>>();
  const { slug } = params!;
  const { addItem } = useCart();
  const [food, setFood] = useState<FoodItem | null>(null);
  const [sides, setSides] = useState<Side[]>([]);
  const [selectedOption, setSelectedOption] = useState<FoodOption | null>(null);
  const [selectedSides, setSelectedSides] = useState<Side[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchFood(slug), fetchSides()])
      .then(([foodData, sidesData]) => {
        setFood(foodData);
        setSides(sidesData.sides);
        setSelectedOption(foodData.options[0] ?? null);
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
    if (!food || !selectedOption) return;
    const sidesTotal = selectedSides.reduce((sum, s) => sum + s.priceKobo, 0);
    addItem({
      source: 'RESTAURANT',
      foodSlug: food.slug,
      foodName: food.name,
      foodImage: food.heroImage,
      option: selectedOption,
      sides: selectedSides,
      priceKobo: selectedOption.priceKobo + sidesTotal,
      quantity,
    });
  }

  if (loading) return <ActivityIndicator color={colors.brand100} style={styles.loader} />;
  if (error || !food) return <Text style={styles.error}>{error ?? 'Not found'}</Text>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {food.heroImage ? <Image source={{ uri: food.heroImage }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]} />}
        <View style={styles.body}>
          <Text style={styles.name}>{food.name}</Text>
          <Text style={styles.description}>{food.description}</Text>

          <Text style={styles.section}>Choose an option</Text>
          {food.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.option, selectedOption?.id === option.id && styles.optionActive]}
              onPress={() => setSelectedOption(option)}
            >
              <Text style={styles.optionText}>{option.label} — {formatPrice(option.priceKobo)}</Text>
            </TouchableOpacity>
          ))}

          {sides.length > 0 && (
            <>
              <Text style={styles.section}>Add sides</Text>
              {sides.map((side) => (
                <TouchableOpacity key={side.id} style={styles.side} onPress={() => toggleSide(side)}>
                  <Text style={styles.sideText}>{selectedSides.find((s) => s.id === side.id) ? '✓ ' : '○ '}{side.name} — {formatPrice(side.priceKobo)}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          <View style={styles.quantity}>
            <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyButton}>
              <Text style={styles.qtyText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyCount}>{quantity}</Text>
            <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyButton}>
              <Text style={styles.qtyText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
            <Text style={styles.addText}>Add to cart — {formatPrice(((selectedOption?.priceKobo ?? 0) + selectedSides.reduce((s, x) => s + x.priceKobo, 0)) * quantity)}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.md },
  image: { width: '100%', height: 240, backgroundColor: colors.brand800 },
  placeholder: { backgroundColor: colors.brand900 },
  body: { padding: spacing.md },
  name: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700' },
  description: { color: colors.muted, marginVertical: spacing.sm },
  section: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm },
  option: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.md, marginBottom: spacing.sm },
  optionActive: { borderWidth: 1, borderColor: colors.brand100 },
  optionText: { color: colors.white },
  side: { paddingVertical: spacing.sm },
  sideText: { color: colors.white },
  quantity: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  qtyButton: { backgroundColor: colors.brand800, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md },
  qtyText: { color: colors.white, fontSize: fontSizes.lg },
  qtyCount: { color: colors.white, fontSize: fontSizes.xl, marginHorizontal: spacing.lg },
  addButton: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  addText: { color: colors.brand900, fontWeight: '700' },
});
