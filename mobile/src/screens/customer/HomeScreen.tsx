import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { fetchFoods, type FoodItem } from '../../lib/api';
import { FoodCard } from '../../components/FoodCard';
import { Logo } from '../../components/Logo';
import { User } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type ViewTab = 'home' | 'cooks' | 'restaurants' | 'nearby';
const tabs: { id: ViewTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'cooks', label: 'Food' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'nearby', label: 'Around Me' },
];

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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

  const itemHeight = height;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
                insets={insets}
              />
            </View>
          )}
        />
      )}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Logo />
        <TouchableOpacity style={styles.account} onPress={() => user ? navigation.navigate('MainTabs' as never) : navigation.navigate('Auth', { mode: 'signin' })}>
          <User size={20} color={colors.black} />
        </TouchableOpacity>
      </View>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.lg }]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, zIndex: 30 },
  account: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  nav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingBottom: spacing.sm, zIndex: 20 },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 9999 },
  tabActive: { backgroundColor: colors.white },
  tabText: { color: colors.muted, fontSize: fontSizes.sm, fontWeight: '600' },
  tabTextActive: { color: colors.black },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.md },
});
