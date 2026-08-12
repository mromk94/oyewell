import React, { useEffect, useState } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii, spacing, fontSizes } from '../theme';
import { formatPrice } from '../lib/api';
import { useCart } from '../lib/cart';
import type { CookListing } from '../lib/listingsApi';
import { ChefHat, Clock, Star, MapPin, Heart, Bookmark, Flag } from 'lucide-react-native';

interface Props {
  listing: CookListing;
  insets: { bottom: number; top: number };
  tabBarHeight: number;
}

export function CookListingHero({ listing, insets, tabBarHeight }: Props) {
  const { addItem } = useCart();
  const media = listing.media?.length ? listing.media : [{ url: '', type: 'IMAGE' as const }];
  const [index, setIndex] = useState(0);
  const isAvailable = listing.isActive && listing.stock > 0;

  useEffect(() => {
    if (media.length <= 1) return;
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % media.length), 6000);
    return () => clearInterval(interval);
  }, [media]);

  const active = media[index];

  return (
    <View style={styles.card}>
      <ImageBackground source={{ uri: active?.url }} style={styles.media} resizeMode="cover" imageStyle={{ backgroundColor: colors.brand800 }}>
        <View style={styles.overlay} />
        <View style={[styles.indicators, { top: insets.top + 108 }]}>
          {media.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <View style={[styles.content, { paddingBottom: insets.bottom + tabBarHeight + spacing.lg }]}>
          <View style={[styles.badge, { backgroundColor: isAvailable ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }]}>
            <Text style={[styles.badgeText, { color: isAvailable ? '#86efac' : '#fca5a5' }]}>
              {isAvailable ? 'Available now' : listing.status === 'PAUSED' ? 'Paused' : 'Unavailable'}
            </Text>
          </View>
          <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>{listing.title}</Text>
          {listing.description && <Text style={styles.description} numberOfLines={2}>{listing.description}</Text>}
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <ChefHat size={14} color={colors.success} />
              <Text style={styles.metaText}>{listing.cook.displayName}</Text>
            </View>
            {listing.cook.rating > 0 && (
              <View style={styles.metaItem}>
                <Star size={14} color={colors.warning} />
                <Text style={styles.metaText}>{listing.cook.rating.toFixed(1)}</Text>
              </View>
            )}
            {listing.distanceKm !== undefined && (
              <View style={styles.metaItem}>
                <MapPin size={14} color={colors.muted} />
                <Text style={styles.metaText}>{listing.distanceKm.toFixed(1)} km away</Text>
              </View>
            )}
            {listing.prepTimeMinutesMax && (
              <View style={styles.metaItem}>
                <Clock size={14} color={colors.muted} />
                <Text style={styles.metaText}>Ready in {listing.prepTimeMinutesMax} min</Text>
              </View>
            )}
          </View>
          <View style={styles.row}>
            <Text style={styles.price}>{formatPrice(listing.priceKobo)}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.action} activeOpacity={0.8}>
                <Heart size={18} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.action} activeOpacity={0.8}>
                <Bookmark size={18} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.action} activeOpacity={0.8}>
                <Flag size={18} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.orderButton}
                activeOpacity={0.8}
                onPress={() =>
                  isAvailable &&
                  addItem({
                    source: 'COOK',
                    cookListingId: listing.id,
                    cookName: listing.cook.displayName,
                    foodName: listing.title,
                    foodImage: listing.media[0]?.url ?? null,
                    unitLabel: listing.portionDescription ?? 'portion',
                    priceKobo: listing.priceKobo,
                    quantity: 1,
                  })
                }
              >
                <Text style={styles.orderText}>Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  media: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  indicators: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 18, backgroundColor: colors.success },
  content: { padding: spacing.lg },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, marginBottom: spacing.md },
  badgeText: { fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { color: colors.white, fontSize: fontSizes.hero, fontWeight: '800', lineHeight: fontSizes.hero + 4 },
  description: { color: 'rgba(255,255,255,0.8)', fontSize: fontSizes.base, marginTop: spacing.sm, lineHeight: 22 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { color: colors.white, fontSize: fontSizes.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.lg },
  price: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  action: { width: 38, height: 38, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  orderButton: { backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.full },
  orderText: { color: colors.black, fontSize: fontSizes.base, fontWeight: '700' },
});
