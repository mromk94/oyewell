import React, { useEffect, useState } from 'react';
import { View, Text, Image, ImageBackground, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp, useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { formatPrice } from '../../lib/api';
import { useCart } from '../../lib/cart';
import { fetchCookListing, fetchCookReviews, type CookListing } from '../../lib/listingsApi';
import { ChevronLeft, ShoppingCart, Star, Plus, Minus } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { Preloader } from '../../components/Preloader';

export function CookListingDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'CookListing'>>();
  const id = params?.id;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const heroHeight = Math.min(height * 0.45, 360);
  const bottomPad = Math.max(insets.bottom, spacing.lg);
  const { addItem, count } = useCart();
  const [listing, setListing] = useState<CookListing | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Missing listing id');
      setLoading(false);
      return;
    }
    fetchCookListing(id)
      .then((l) => {
        setListing(l);
        if (l.cook?.id) {
          fetchCookReviews(l.cook.id).then((r) => setReviews(r.reviews)).catch(() => setReviews([]));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load listing'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleAddToCart() {
    if (!listing) return;
    if (quantity > listing.stock) return;
    addItem({
      source: 'COOK',
      cookListingId: listing.id,
      foodName: listing.title,
      cookName: listing.cook.displayName,
      unitLabel: listing.portionDescription ?? 'portion',
      priceKobo: listing.priceKobo,
      foodImage: listing.media?.[0]?.url ?? null,
      quantity,
      sideIds: [],
    });
    setAdded(true);
  }

  if (loading) return <Preloader />;
  if (error || !listing) return <Text style={styles.error}>{error ?? 'Not found'}</Text>;

  const subtotal = listing.priceKobo * quantity;
  const canAdd = listing.isActive && listing.stock > 0 && quantity <= listing.stock;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 110 }}>
        <View style={[styles.hero, { height: heroHeight }]}>
          {listing.media?.[0]?.url ? (
            <ImageBackground source={{ uri: listing.media[0].url }} style={styles.image} resizeMode="cover" imageStyle={{ backgroundColor: colors.brand800 }}>
              <View style={styles.heroOverlay} />
            </ImageBackground>
          ) : (
            <View style={[styles.image, styles.placeholder]} />
          )}
          <TouchableOpacity style={[styles.back, { top: insets.top + spacing.sm }]} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cart, { top: insets.top + spacing.sm }]} onPress={() => navigation.navigate('Cart')}>
            <ShoppingCart size={20} color={colors.white} />
            {count > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeCount}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{listing.title}</Text>
          <Text style={styles.description}>{listing.description}</Text>
          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: canAdd ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }]}>
              <Text style={[styles.tagText, { color: canAdd ? '#86efac' : '#fca5a5' }]}>
                {canAdd ? `${listing.stock} left` : 'Unavailable'}
              </Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{listing.cook.displayName}</Text>
            </View>
            {listing.cuisine && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{listing.cuisine}</Text>
              </View>
            )}
          </View>

          <View style={styles.box}>
            <View style={styles.row}>
              <View>
                <Text style={styles.price}>{formatPrice(subtotal)}</Text>
                <Text style={styles.per}>{formatPrice(listing.priceKobo)} per {listing.portionDescription ?? 'portion'}</Text>
              </View>
              <View style={styles.quantityPill}>
                <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyButton} disabled={quantity <= 1}>
                  <Minus size={18} color={quantity <= 1 ? colors.muted : colors.white} />
                </TouchableOpacity>
                <Text style={styles.qtyCount}>{quantity}</Text>
                <TouchableOpacity onPress={() => setQuantity((q) => q < listing.stock ? q + 1 : q)} style={styles.qtyButton} disabled={quantity >= listing.stock}>
                  <Plus size={18} color={quantity >= listing.stock ? colors.muted : colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.box}>
            <Text style={styles.section}>Reviews</Text>
            {reviews.length === 0 ? (
              <Text style={styles.empty}>No reviews yet.</Text>
            ) : (
              <>
                <View style={styles.rating}>
                  <Star size={18} color={colors.warning} />
                  <Text style={styles.ratingText}>{listing.cook.rating.toFixed(1)}</Text>
                  <Text style={styles.reviewCount}>({reviews.length})</Text>
                </View>
                {reviews.map((r) => (
                  <View key={r.id} style={styles.review}>
                    <View style={styles.stars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} color={i < r.rating ? colors.warning : colors.muted} />
                      ))}
                    </View>
                    {r.comment && <Text style={styles.reviewText}>{r.comment}</Text>}
                    <Text style={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { bottom: bottomPad + spacing.md }]}>
        {added ? (
          <TouchableOpacity style={styles.added} onPress={() => navigation.navigate('Cart')}>
            <ShoppingCart size={20} color={colors.success} />
            <Text style={styles.addedText}>Added — view cart</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.addButton, !canAdd && styles.addButtonDisabled]} onPress={handleAddToCart} activeOpacity={0.8} disabled={!canAdd}>
            <Text style={styles.addText}>Add to cart · {formatPrice(subtotal)}</Text>
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
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  placeholder: { backgroundColor: colors.brand900 },
  back: { position: 'absolute', left: spacing.md, padding: spacing.sm, borderRadius: radii.full, backgroundColor: 'rgba(0,0,0,0.4)' },
  cart: { position: 'absolute', right: spacing.md, padding: spacing.sm, borderRadius: radii.full, backgroundColor: 'rgba(0,0,0,0.4)' },
  badgeDot: { position: 'absolute', top: -6, right: -6, backgroundColor: colors.success, minWidth: 20, height: 20, borderRadius: 999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeCount: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '800' },
  body: { padding: spacing.lg },
  name: { color: colors.white, fontSize: fontSizes.hero, fontWeight: '800', marginBottom: spacing.sm },
  description: { color: colors.muted, fontSize: fontSizes.lg, marginBottom: spacing.md, lineHeight: 26 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  tag: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tagText: { color: colors.white, fontSize: fontSizes.sm },
  box: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  price: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700' },
  per: { color: colors.muted, fontSize: fontSizes.sm, marginTop: spacing.xs },
  quantityPill: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.xs },
  qtyButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  qtyCount: { color: colors.white, fontSize: fontSizes.xl, minWidth: 40, textAlign: 'center' },
  footer: { position: 'absolute', left: spacing.md, right: spacing.md, backgroundColor: colors.brand900, paddingTop: spacing.md },
  addButton: { backgroundColor: colors.white, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  addButtonDisabled: { opacity: 0.5 },
  addText: { color: colors.brand900, fontSize: fontSizes.base, fontWeight: '800' },
  added: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(34,197,94,0.1)', padding: spacing.md, borderRadius: radii.full },
  addedText: { color: colors.success, fontSize: fontSizes.base, fontWeight: '700' },
  section: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700', marginBottom: spacing.sm },
  empty: { color: colors.muted, fontSize: fontSizes.base },
  rating: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  ratingText: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700' },
  reviewCount: { color: colors.muted, fontSize: fontSizes.sm },
  review: { borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing.md, marginBottom: spacing.sm },
  stars: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  reviewText: { color: colors.white, fontSize: fontSizes.sm, marginBottom: spacing.xs },
  reviewDate: { color: colors.muted, fontSize: fontSizes.xs },
});
