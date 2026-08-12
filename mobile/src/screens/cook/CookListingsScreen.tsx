import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, Switch, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { fetchCookListings, updateCookListingAvailability, deleteCookListing, type CookListing } from '../../lib/cookApi';
import { useInterval } from '../../lib/polling';
import { formatPrice } from '../../lib/api';
import { Plus, Pencil, Trash2 } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/AppNavigator';

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

  async function toggleAvailable(id: string, value: boolean) {
    try {
      const { listing } = await updateCookListingAvailability(id, value);
      setListings((prev) => prev.map((l) => (l.id === id ? listing : l)));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCookListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
    }
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
                <Text style={styles.meta}>{item.stock} left · {item.isActive ? 'Approved' : item.status}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleEdit(item)}>
                  <Pencil size={18} color={colors.brand100} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Trash2 size={18} color={colors.danger} />
                </TouchableOpacity>
                <Switch
                  value={item.isAvailable}
                  onValueChange={(value) => toggleAvailable(item.id, value)}
                  trackColor={{ false: colors.brand900, true: colors.brand100 }}
                  thumbColor={colors.white}
                />
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
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700' },
  add: { backgroundColor: colors.brand100, padding: spacing.sm, borderRadius: radii.full },
  list: { paddingBottom: spacing.md },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  listing: { flexDirection: 'row', backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: radii.md, marginRight: spacing.md, backgroundColor: colors.brand900 },
  info: { flex: 1 },
  name: { color: colors.white, fontWeight: '600' },
  price: { color: colors.brand100, marginTop: spacing.xs },
  meta: { color: colors.muted, fontSize: fontSizes.sm, marginTop: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
