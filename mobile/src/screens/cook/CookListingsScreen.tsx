import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { fetchCookListings, updateCookListingAvailability, type CookListing } from '../../lib/cookApi';
import { useInterval } from '../../lib/polling';
import { formatPrice } from '../../lib/api';

export function CookListingsScreen() {
  const [listings, setListings] = useState<CookListing[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>My listings</Text>
      {loading ? <ActivityIndicator color={colors.brand100} /> : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No listings yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.listing}>
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.title}</Text>
                  <Text style={styles.price}>{formatPrice(item.priceKobo)}</Text>
                </View>
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
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.md },
  list: { paddingBottom: spacing.md },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  listing: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1, marginRight: spacing.sm },
  name: { color: colors.white, fontWeight: '600' },
  price: { color: colors.brand100, marginTop: spacing.xs },
});
