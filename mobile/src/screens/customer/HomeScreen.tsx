import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, useWindowDimensions, TouchableOpacity, TextInput, Switch } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { fetchFoods, type FoodItem } from '../../lib/api';
import { fetchCookListingsPublic, type CookListing } from '../../lib/listingsApi';
import { FoodCard } from '../../components/FoodCard';
import { CookListingHero } from '../../components/CookListingHero';
import { Logo } from '../../components/Logo';
import { ScrollHint } from '../../components/ScrollHint';
import { User, X, Search } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type ViewTab = 'home' | 'cooks' | 'restaurants' | 'nearby';
const cookViews: ViewTab[] = ['cooks', 'nearby'];
const tabs: { id: ViewTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'cooks', label: 'Food' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'nearby', label: 'Around Me' },
];

const TAB_BAR_HEIGHT = 56;

interface Filters {
  q: string;
  cuisine: string;
  maxPrice: string;
  available: boolean;
}

function filterFoods(list: FoodItem[], filters: Filters) {
  let base = list;
  if (filters.q.trim()) {
    const q = filters.q.toLowerCase();
    base = base.filter((f) => f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)));
  }
  if (filters.available) base = base.filter((f) => f.isAvailable);
  if (filters.maxPrice) {
    const max = Number(filters.maxPrice) * 100;
    base = base.filter((f) => !f.priceFromKobo || f.priceFromKobo <= max);
  }
  return base;
}

function filterCookListings(list: CookListing[], filters: Filters) {
  let base = list;
  if (filters.q.trim()) {
    const q = filters.q.toLowerCase();
    base = base.filter((l) =>
      l.title.toLowerCase().includes(q) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      l.cook.displayName.toLowerCase().includes(q)
    );
  }
  if (filters.cuisine) base = base.filter((l) => l.cuisine && l.cuisine.toLowerCase() === filters.cuisine.toLowerCase());
  if (filters.available) base = base.filter((l) => l.isActive && l.stock > 0);
  if (filters.maxPrice) {
    const max = Number(filters.maxPrice) * 100;
    base = base.filter((l) => l.priceKobo <= max);
  }
  return base;
}

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [cookListings, setCookListings] = useState<CookListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ViewTab>('home');
  const [reps, setReps] = useState(1);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({ q: '', cuisine: '', maxPrice: '', available: false });
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const isAppending = useRef(false);
  const listRef = useRef<FlatList<FoodItem | CookListing>>(null);

  useEffect(() => {
    Promise.all([
      fetchFoods().then(({ foods }) => setFoods(foods)),
      fetchCookListingsPublic({ take: 20 }).then(({ listings }) => setCookListings(listings)),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => { setLoading(false); });
    setReps(1);
  }, []);

  useEffect(() => {
    isAppending.current = false;
  }, [reps]);

  useEffect(() => {
    setReps(1);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [active, filters]);

  // nearby uses the same public cook listings for now until a native location API is added

  const filteredFoods = useMemo(() => filterFoods(foods, filters), [foods, filters]);
  const filteredCookListings = useMemo(() => filterCookListings(cookListings, filters), [cookListings, filters]);
  const cuisines = useMemo(() => {
    const set = new Set<string>();
    cookListings.forEach((l) => l.cuisine && set.add(l.cuisine));
    return Array.from(set).sort();
  }, [cookListings]);

  const visibleFoods = useMemo(() => Array.from({ length: reps }).flatMap(() => filteredFoods), [filteredFoods, reps]);
  const visibleCookListings = useMemo(() => Array.from({ length: reps }).flatMap(() => filteredCookListings), [filteredCookListings, reps]);

  const itemHeight = height;

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setScrollY(contentOffset.y);
    setContentHeight(contentSize.height);
    setCanScrollUp(contentOffset.y > 10);
    setCanScrollDown(contentOffset.y < contentSize.height - layoutMeasurement.height - 10);

    if (isAppending.current) return;
    const list = cookViews.includes(active) ? filteredCookListings : filteredFoods;
    if (list.length === 0) return;
    const totalHeight = reps * list.length * itemHeight;
    if (contentOffset.y + layoutMeasurement.height >= totalHeight - 100) {
      isAppending.current = true;
      setReps((r) => r + 1);
    }
  }, [filteredFoods, filteredCookListings, itemHeight, reps, active]);

  function handleNavigate(direction: 'up' | 'down') {
    const currentIndex = Math.round(scrollY / itemHeight);
    const nextIndex = direction === 'down' ? currentIndex + 1 : currentIndex - 1;
    const maxIndex = Math.max(0, Math.ceil(contentHeight / itemHeight) - 1);
    const targetIndex = Math.max(0, Math.min(nextIndex, maxIndex));
    listRef.current?.scrollToOffset({ offset: targetIndex * itemHeight, animated: true });
  }

  function renderFood({ item }: { item: FoodItem }) {
    return (
      <View style={{ height: itemHeight }}>
        <FoodCard
          food={item}
          onPress={() => navigation.navigate('Food', { slug: item.slug })}
          insets={insets}
          tabBarHeight={user ? TAB_BAR_HEIGHT : 0}
        />
      </View>
    );
  }

  function renderCook({ item }: { item: CookListing }) {
    return (
      <View style={{ height: itemHeight }}>
        <CookListingHero
          listing={item}
          insets={insets}
          tabBarHeight={user ? TAB_BAR_HEIGHT : 0}
        />
      </View>
    );
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

  const data = cookViews.includes(active) ? visibleCookListings : visibleFoods;
  const renderItem = ({ item }: any) => (cookViews.includes(active) ? renderCook({ item }) : renderFood({ item }));

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        ref={listRef}
        data={data as any}
        keyExtractor={(item: any, i: number) => `${item.id ?? item.slug}-${i}`}
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={itemHeight}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={renderItem}
      />

      <ScrollHint canScrollUp={canScrollUp} canScrollDown={canScrollDown} onNavigate={handleNavigate} />

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Logo />
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setFiltersOpen((s) => !s)}>
            {filtersOpen ? <X size={18} color={colors.white} /> : <Search size={18} color={colors.white} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => user ? navigation.navigate('MainTabs' as never) : navigation.navigate('Auth', { mode: 'signin' })}>
            <User size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {filtersOpen && (
        <View style={[styles.filtersPanel, { top: insets.top + 56 }]}>
          <TextInput
            style={styles.input}
            placeholder="Search..."
            placeholderTextColor={colors.muted}
            value={filters.q}
            onChangeText={(q) => setFilters((f) => ({ ...f, q }))}
            autoFocus
          />
          <View style={styles.cuisines}>
            {cuisines.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cuisineChip, filters.cuisine === c && styles.cuisineChipActive]}
                onPress={() => setFilters((f) => ({ ...f, cuisine: f.cuisine === c ? '' : c }))}
              >
                <Text style={[styles.cuisineChipText, filters.cuisine === c && styles.cuisineChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Max price (₦)"
            placeholderTextColor={colors.muted}
            value={filters.maxPrice}
            onChangeText={(maxPrice) => setFilters((f) => ({ ...f, maxPrice }))}
            keyboardType="number-pad"
          />
          <View style={styles.availableRow}>
            <Text style={styles.availableText}>Available now</Text>
            <Switch value={filters.available} onValueChange={(v) => setFilters((f) => ({ ...f, available: v }))} trackColor={{ false: colors.brand800, true: colors.success }} thumbColor={colors.white} />
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={() => setFilters({ q: '', cuisine: '', maxPrice: '', available: false })}>
            <Text style={styles.clearText}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {!filtersOpen && (
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
      )}
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
  filtersPanel: { position: 'absolute', left: spacing.md, right: spacing.md, backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, zIndex: 25 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', color: colors.white, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  cuisines: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  cuisineChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)' },
  cuisineChipActive: { backgroundColor: colors.success, borderColor: colors.success },
  cuisineChipText: { color: colors.muted, fontSize: fontSizes.sm },
  cuisineChipTextActive: { color: colors.black, fontWeight: '700' },
  availableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.sm },
  availableText: { color: colors.white, fontSize: fontSizes.base },
  clearButton: { padding: spacing.sm, alignItems: 'center' },
  clearText: { color: colors.danger, fontWeight: '700' },
});
