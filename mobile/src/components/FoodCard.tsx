import React, { useEffect, useState } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii, spacing, fontSizes } from '../theme';
import type { FoodItem } from '../lib/api';

export const FoodCard = React.memo(function FoodCard({ food, onPress }: { food: FoodItem; onPress: () => void }) {
  const media = buildMedia(food);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (media.length <= 1) return;
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % media.length), 6000);
    return () => clearInterval(interval);
  }, [media]);

  const active = media[index];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      <ImageBackground source={{ uri: active?.url }} style={styles.media} resizeMode="cover" imageStyle={{ backgroundColor: colors.brand800 }}>
        <View style={styles.overlay} />
        <View style={styles.indicators}>
          {media.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.content}>
          <View style={[styles.badge, { backgroundColor: food.isAvailable ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }]}>
            <Text style={[styles.badgeText, { color: food.isAvailable ? '#86efac' : '#fca5a5' }]}>
              {food.isAvailable ? 'Available today' : 'Unavailable'}
            </Text>
          </View>
          <Text style={styles.name}>{food.name}</Text>
          {food.description && <Text style={styles.description} numberOfLines={2}>{food.description}</Text>}
          <View style={styles.row}>
            {food.priceFrom && <Text style={styles.price}>{food.priceFrom}</Text>}
            <View style={styles.orderButton}>
              <Text style={styles.orderText}>Order</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
});

function buildMedia(food: FoodItem): { url: string }[] {
  const out: { url: string }[] = [];
  if (food.heroImage) out.push({ url: food.heroImage });
  food.galleryImages?.forEach((url) => out.push({ url }));
  food.videos?.forEach((url) => out.push({ url }));
  return out;
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  media: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  indicators: { position: 'absolute', top: 48, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 18, backgroundColor: colors.success },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, marginBottom: spacing.md },
  badgeText: { fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { color: colors.white, fontSize: 40, fontWeight: '800', lineHeight: 44 },
  description: { color: 'rgba(255,255,255,0.8)', fontSize: fontSizes.lg, marginTop: spacing.sm, lineHeight: 26 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.lg },
  price: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '600' },
  orderButton: { backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.full },
  orderText: { color: colors.black, fontSize: fontSizes.base, fontWeight: '700' },
});

