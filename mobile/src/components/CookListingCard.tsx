import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, fontSizes } from '../theme';
import { formatPrice } from '../lib/api';
import type { CookListing } from '../lib/listingsApi';
import { ChefHat, Clock, Star, MapPin } from 'lucide-react-native';

interface Props {
  listing: CookListing;
  onPress?: () => void;
}

export function CookListingCard({ listing, onPress }: Props) {
  const cover = listing.media?.[0]?.url;
  const isAvailable = listing.isActive && listing.stock > 0;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.media}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.image} resizeMode="cover" />
        ) : null}
        {listing.cuisine && (
          <View style={styles.cuisineBadge}>
            <Text style={styles.cuisineText}>{listing.cuisine}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
          <Text style={styles.price}>{formatPrice(listing.priceKobo)}</Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>{listing.description}</Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <ChefHat size={12} color={colors.muted} />
            <Text style={styles.metaText}>{listing.cook.displayName}</Text>
          </View>
          {listing.prepTimeMinutesMax && (
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.muted} />
              <Text style={styles.metaText}>{listing.prepTimeMinutesMax} min</Text>
            </View>
          )}
          {listing.cook.rating > 0 && (
            <View style={styles.metaItem}>
              <Star size={12} color={colors.warning} />
              <Text style={styles.metaText}>{listing.cook.rating.toFixed(1)}</Text>
            </View>
          )}
          {listing.distanceKm !== undefined && (
            <View style={styles.metaItem}>
              <MapPin size={12} color={colors.muted} />
              <Text style={styles.metaText}>{listing.distanceKm.toFixed(1)} km</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.brand800, borderRadius: radii.lg, overflow: 'hidden', marginBottom: spacing.md, width: 260 },
  media: { height: 160, backgroundColor: colors.brand700 },
  image: { ...StyleSheet.absoluteFillObject },
  cuisineBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full },
  cuisineText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700' },
  body: { padding: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs },
  title: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700', flex: 1 },
  price: { color: colors.success, fontSize: fontSizes.base, fontWeight: '800' },
  description: { color: colors.muted, fontSize: fontSizes.sm, marginBottom: spacing.sm },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { color: colors.muted, fontSize: fontSizes.xs },
});
