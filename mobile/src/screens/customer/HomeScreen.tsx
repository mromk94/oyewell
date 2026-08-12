import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { fetchFoods, type FoodItem } from '../../lib/api';
import { FoodCard } from '../../components/FoodCard';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type ViewTab = 'home' | 'cooks' | 'restaurants' | 'nearby';
const tabs: { id: ViewTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'cooks', label: 'Cooks' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'nearby', label: 'Nearby' },
];

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { height } = useWindowDimensions();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ViewTab>('home');

  useEffect(() => {
    fetchFoods()
      .then(({ foods }) => setFoods(foods))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load foods'))
      .finally(() => setLoading(false));
  }, []);

  const itemHeight = Math.max(height - 180, 400);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setActive(t.id)}
            style={[styles.tab, active === t.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, active === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand100} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(item) => item.slug}
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={itemHeight}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ height: itemHeight }}>
              <FoodCard
                food={item}
                onPress={() => navigation.navigate('Food', { slug: item.slug })}
              />
            </View>
          )}
        />
      )}
      {!user && (
        <TouchableOpacity style={styles.signIn} onPress={() => navigation.navigate('Auth', { mode: 'signin' })}>
          <Text style={styles.signInText}>Sign in</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900 },
  nav: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, padding: spacing.sm },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 9999 },
  tabActive: { backgroundColor: colors.white },
  tabText: { color: colors.muted, fontSize: fontSizes.sm, fontWeight: '600' },
  tabTextActive: { color: colors.black },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.md },
  signIn: { position: 'absolute', top: spacing.sm, right: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 9999, backgroundColor: colors.white },
  signInText: { color: colors.black, fontWeight: '700', fontSize: fontSizes.sm },
});
