import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii, spacing, shadows, fontSizes } from '../theme';
import { formatPrice, type FoodItem } from '../lib/api';

export function FoodCard({ food, onPress }: { food: FoodItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {food.heroImage ? (
        <Image source={{ uri: food.heroImage }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{food.name}</Text>
        <Text style={styles.price} numberOfLines={1}>
          {food.priceFrom ?? formatPrice(food.priceFromKobo ?? 0)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.brand800, borderRadius: radii.lg, overflow: 'hidden', ...shadows.small, marginBottom: spacing.md },
  image: { width: '100%', height: 160, backgroundColor: colors.brand900 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  body: { padding: spacing.md },
  name: { color: colors.white, fontSize: fontSizes.base, fontWeight: '600', marginBottom: spacing.xs },
  price: { color: colors.brand100, fontSize: fontSizes.sm },
});
