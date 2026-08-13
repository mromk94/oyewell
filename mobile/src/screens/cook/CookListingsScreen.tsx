import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { fetchCookListings, updateCookListing, deleteCookListing, type CookListing } from '../../lib/cookApi';
import { useInterval } from '../../lib/polling';
import { formatPrice } from '../../lib/api';
import { Plus, Pencil, Trash2 } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  APPROVED: { bg: 'rgba(34,197,94,0.2)', text: '#86efac' },
  PENDING_REVIEW: { bg: 'rgba(234,179,8,0.2)', text: '#fde047' },
  DRAFT: { bg: 'rgba(59,130,246,0.2)', text: '#93c5fd' },
  PAUSED: { bg: 'rgba(239,68,68,0.2)', text: '#fca5a5' },
  REJECTED: { bg: 'rgba(239,68,68,0.3)', text: '#fca5a5' },
  SOLD_OUT: { bg: 'rgba(249,115,22,0.2)', text: '#fdba74' },
  ARCHIVED: { bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.5)' },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status] ?? { bg: 'rgba(255,255,255,0.1)', text: colors.muted };
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.text }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

export function CookListingsScreen() {
  const [listings, setListings] = useState<CookListing[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  function load() {
    setLoading(true);
    fetchCookListings()
      .then(({ listings }) => setListings(listings))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);
  useInterval(load, 15000);

  async function toggleStatus(id: string, status: string) {
    try {
      const { listing } = await updateCookListing(id, { status });
      setListings((prev) => prev.map((l) => (l.id === id ? listing : l)));
    } catch (err) {
      console.error(err);
    }
  }

  function handleDelete(id: string) {
    Alert.alert('Delete this food?', 'Customers will no longer be able to order it.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Yes, delete', style: 'destructive', onPress: async () => {
        try {
          await deleteCookListing(id);
          setListings((prev) => prev.filter((l) => l.id !== id));
        } catch (err) {
          console.error(err);
        }
      } },
    ]);
  }

  function handleEdit(listing: CookListing) {
    navigation.navigate('CookListingForm', { listing });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My listings</Text>
        <TouchableOpacity style={styles.add} onPress={() => navigation.navigate('CookListingForm', {})}>
          <Plus size={20} color={colors.brand900} />
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={colors.brand100} /> : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No listings yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.listing}>
              {item.media?.[0]?.url && <Image source={{ uri: item.media[0].url }} style={styles.thumb} />}
              <View style={styles.info}>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.price}>{formatPrice(item.priceKobo)}</Text>
                <View style={styles.metaRow}>
                  <StatusBadge status={item.status} />
                  <Text style={styles.stock}>{item.stock} left</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleEdit(item)}>
                  <Pencil size={18} color={colors.brand100} />
                </TouchableOpacity>
                {item.status === 'APPROVED' && (
                  <TouchableOpacity style={styles.actionButton} onPress={() => toggleStatus(item.id, 'PAUSED')}>
                    <Text style={styles.actionButtonText}>Pause</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'PAUSED' && (
                  <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => toggleStatus(item.id, 'APPROVED')}>
                    <Text style={[styles.actionButtonText, { color: colors.brand900 }]}>Resume</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Trash2 size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800' },
  add: { backgroundColor: colors.brand100, padding: spacing.sm, borderRadius: radii.full },
  list: { paddingBottom: spacing.md },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  listing: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: radii.md, marginRight: spacing.md, backgroundColor: colors.brand900 },
  info: { flex: 1 },
  name: { color: colors.white, fontWeight: '600' },
  price: { color: colors.brand100, marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  stock: { color: colors.muted, fontSize: fontSizes.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: fontSizes.xs, fontWeight: '700' },
  actionButton: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full },
  actionButtonPrimary: { backgroundColor: colors.brand100 },
  actionButtonText: { color: colors.white, fontWeight: '700', fontSize: fontSizes.xs },
});
