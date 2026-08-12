import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { fetchFoods, type FoodItem } from '../../lib/api';
import { FoodCard } from '../../components/FoodCard';
import { Logo } from '../../components/Logo';
import { ScrollHint } from '../../components/ScrollHint';
import { User, Search } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type ViewTab = 'home' | 'cooks' | 'restaurants' | 'nearby';
const tabs: { id: Exclude<ViewTab, 'home'>; label: string }[] = [
  { id: 'cooks', label: 'Food' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'nearby', label: 'Around Me' },
];

const TAB_BAR_HEIGHT = 56;

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ViewTab>('home');
  const [reps, setReps] = useState(1);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const isAppending = useRef(false);
  const listRef = useRef<FlatList<FoodItem>>(null);

  useEffect(() => {
    fetchFoods()
      .then(({ foods }) => setFoods(foods))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load foods'))
      .finally(() => setLoading(false));
    setReps(1);
  }, []);

  useEffect(() => {
    isAppending.current = false;
  }, [reps]);

  const visibleFoods = useMemo(() => {
    return Array.from({ length: reps }).flatMap(() => foods);
  }, [foods, reps]);

  const itemHeight = height;

  function handleScroll(e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setCanScrollUp(contentOffset.y > 10);
    setCanScrollDown(contentOffset.y < contentSize.height - layoutMeasurement.height - 10);

    if (active === 'nearby' || isAppending.current) return;
    const totalHeight = reps * foods.length * itemHeight;
    if (contentOffset.y + layoutMeasurement.height >= totalHeight - 100) {
      isAppending.current = true;
      setReps((r) => r + 1);
    }
  }

  function handleNavigate(direction: 'up' | 'down') {
    const y = direction === 'down' ? itemHeight : -itemHeight;
    listRef.current?.scrollToOffset({ offset: Math.max(0, y), animated: true });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <ActivityIndicator color={colors.brand100} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        ref={listRef}
        data={visibleFoods}
        keyExtractor={(item, i) => `${item.slug}-${i}`}
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={itemHeight}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={{ height: itemHeight }}>
            <FoodCard
              food={item}
              onPress={() => navigation.navigate('Food', { slug: item.slug })}
              insets={insets}
              tabBarHeight={user ? TAB_BAR_HEIGHT : 0}
            />
          </View>
        )}
      />

      <ScrollHint canScrollUp={canScrollUp} canScrollDown={canScrollDown} onNavigate={handleNavigate} />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Logo />
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
            <Search size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => user ? navigation.navigate('MainTabs' as never) : navigation.navigate('Auth', { mode: 'signin' })}>
            <User size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.navWrapper, { top: insets.top + 56 }]}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900 },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.md },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, zIndex: 30 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  iconButton: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  navWrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  nav: { flexDirection: 'row', gap: spacing.xs, padding: spacing.xs, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(0,0,0,0.4)' },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  tabActive: { backgroundColor: colors.white },
  tabText: { color: colors.muted, fontSize: fontSizes.sm, fontWeight: '600' },
  tabTextActive: { color: colors.black },
});
