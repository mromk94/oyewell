import React, { useEffect, useState } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { colors, radii, spacing, fontSizes } from '../theme';
import { formatPrice } from '../lib/api';
import { viewCookListing, likeCookListing } from '../lib/listingsApi';
import { isFavoriteCook, toggleFavoriteCook } from '../lib/favorites';
import { createReport } from '../lib/reports';
import type { CookListing } from '../lib/listingsApi';
import { ChefHat, Clock, Star, MapPin, Heart, Bookmark, Flag } from 'lucide-react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';

const COMMON_REASONS = [
  'Unprofessional behavior',
  'Food safety concern',
  'Wrong or missing items',
  'Harassment or discrimination',
  'Fraud or scam',
  'Other',
];

interface Props {
  listing: CookListing;
  insets: { bottom: number; top: number };
  tabBarHeight: number;
}

export function CookListingHero({ listing, insets, tabBarHeight }: Props) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const media = listing.media?.length ? listing.media : [{ url: '', type: 'IMAGE' as const }];
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(listing.liked ?? false);
  const [likeCount, setLikeCount] = useState(listing.likeCount ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState(COMMON_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const isAvailable = listing.isActive && listing.stock > 0;

  useEffect(() => {
    viewCookListing(listing.id).catch(() => {});
    isFavoriteCook(listing.cook.id).then(setFavorited).catch(() => {});
    if (media.length <= 1) return;
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % media.length), 6000);
    return () => clearInterval(interval);
  }, [media, listing.id, listing.cook.id]);

  async function handleLike() {
    setLikeLoading(true);
    try {
      const res = await likeCookListing(listing.id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (err) {
      Alert.alert('Like failed', err instanceof Error ? err.message : 'Sign in to like');
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleFavorite() {
    const res = await toggleFavoriteCook({
      id: listing.cook.id,
      displayName: listing.cook.displayName,
      profilePhoto: listing.cook.profilePhoto,
    });
    setFavorited(res.favorited);
    Alert.alert(res.favorited ? 'Added to favorite cooks' : 'Removed from favorites');
  }

  async function handleReport() {
    if (!reportReason.trim()) return;
    setReportLoading(true);
    try {
      await createReport({ targetId: listing.cook.id, targetType: 'COOK', reason: reportReason.trim(), details: reportDetails.trim() });
      setReportSubmitted(true);
    } catch (err) {
      Alert.alert('Report failed', err instanceof Error ? err.message : 'Could not submit report');
    } finally {
      setReportLoading(false);
    }
  }

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
              <TouchableOpacity style={[styles.action, liked && styles.actionLiked]} activeOpacity={0.8} onPress={handleLike} disabled={likeLoading}>
                {likeLoading ? <ActivityIndicator color={liked ? colors.white : colors.white} size="small" /> : (
                  <>
                    <Heart size={18} color={liked ? colors.danger : colors.white} fill={liked ? colors.danger : 'transparent'} />
                    {likeCount > 0 && <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>{likeCount}</Text>}
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.action, favorited && styles.actionFavorited]} activeOpacity={0.8} onPress={handleFavorite}>
                <Bookmark size={18} color={favorited ? colors.brand900 : colors.white} fill={favorited ? colors.brand900 : 'transparent'} />
                <Text style={[styles.actionLabel, favorited && styles.actionLabelFavorited]}>{favorited ? 'Favorited' : 'Favorite'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.action} activeOpacity={0.8} onPress={() => setShowReport(true)}>
                <Flag size={18} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.orderButton}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('CookListing', { id: listing.id })}
              >
                <Text style={styles.orderText}>Order</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Modal visible={showReport} transparent animationType="fade" onRequestClose={() => setShowReport(false)}>
            <View style={styles.modalBackdrop}>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.modal}>
                  {reportSubmitted ? (
                    <View style={styles.submitted}>
                      <Flag size={36} color={colors.success} />
                      <Text style={styles.modalTitle}>Thank you</Text>
                      <Text style={styles.modalBody}>Your report has been sent to our moderation team.</Text>
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => {
                          setShowReport(false);
                          setReportSubmitted(false);
                          setReportReason(COMMON_REASONS[0]);
                          setReportDetails('');
                        }}
                      >
                        <Text style={styles.primaryButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.modalTitle}>Report cook</Text>
                      <Text style={styles.modalBody}>Tell us why you are reporting this cook.</Text>
                      <Text style={styles.label}>Reason</Text>
                      {COMMON_REASONS.map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[styles.reasonChip, reportReason === r && styles.reasonChipActive]}
                          onPress={() => setReportReason(r)}
                        >
                          <Text style={[styles.reasonChipText, reportReason === r && styles.reasonChipTextActive]}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                      <Text style={[styles.label, { marginTop: spacing.md }]}>Details</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Tell us more about what happened..."
                        placeholderTextColor={colors.muted}
                        value={reportDetails}
                        onChangeText={setReportDetails}
                        multiline
                      />
                      <TouchableOpacity style={styles.primaryButton} onPress={handleReport} disabled={reportLoading || !reportReason.trim()}>
                        {reportLoading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.primaryButtonText}>Submit report</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowReport(false)}>
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </ScrollView>
            </View>
          </Modal>
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
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, marginBottom: spacing.sm },
  badgeText: { fontSize: fontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800', lineHeight: fontSizes.xxl + 4 },
  description: { color: 'rgba(255,255,255,0.8)', fontSize: fontSizes.sm, marginTop: spacing.xs, lineHeight: 20 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { color: colors.white, fontSize: fontSizes.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  price: { color: colors.white, fontSize: fontSizes.base, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: colors.border },
  actionLiked: { backgroundColor: colors.danger },
  actionCount: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700' },
  actionCountLiked: { color: colors.white },
  actionFavorited: { backgroundColor: '#facc15' },
  actionLabel: { color: colors.white, fontSize: fontSizes.xs, fontWeight: '700' },
  actionLabelFavorited: { color: colors.brand900 },
  orderButton: { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full },
  orderText: { color: colors.black, fontSize: fontSizes.sm, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.brand900, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: '100%' },
  submitted: { alignItems: 'center' },
  modalTitle: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800', marginBottom: spacing.sm },
  modalBody: { color: colors.muted, marginBottom: spacing.md },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', color: colors.white, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: spacing.md, minHeight: 80, textAlignVertical: 'top' },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: fontSizes.sm, fontWeight: '600', marginBottom: spacing.sm },
  reasonChip: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radii.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  reasonChipActive: { backgroundColor: colors.brand100, borderColor: colors.brand100 },
  reasonChipText: { color: colors.muted, fontSize: fontSizes.sm, fontWeight: '600' },
  reasonChipTextActive: { color: colors.brand900 },
  primaryButton: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  primaryButtonText: { color: colors.brand900, fontWeight: '700' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: spacing.md, borderRadius: radii.full, alignItems: 'center', marginTop: spacing.sm },
  secondaryButtonText: { color: colors.white, fontWeight: '700' },
});
