import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, useWindowDimensions, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { fetchFoods, type FoodItem } from '../../lib/api';
import { FoodCard } from '../../components/FoodCard';
import { Logo } from '../../components/Logo';
import { ScrollHint } from '../../components/ScrollHint';
import { User, Search, X } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type ViewTab = 'home' | 'cooks' | 'restaurants' | 'nearby';
const tabs: { id: ViewTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'cooks', label: 'Food' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'nearby', label: 'Around Me' },
];

const TAB_BAR_HEIGHT = 56;

function filterFoods(list: FoodItem[], q: string) {
  let base = list;
  if (q.trim()) {
    const term = q.toLowerCase();
    base = base.filter((f) => f.name.toLowerCase().includes(term) || (f.description && f.description.toLowerCase().includes(term)));
  }
  return base;
}

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
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

  useEffect(() => {
    setReps(1);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [active, query]);

  const filteredFoods = useMemo(() => filterFoods(foods, query), [foods, query]);

  const visibleFoods = useMemo(() => {
    return Array.from({ length: reps }).flatMap(() => filteredFoods);
  }, [filteredFoods, reps]);

  const itemHeight = height;

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setScrollY(contentOffset.y);
    setContentHeight(contentSize.height);
    setCanScrollUp(contentOffset.y > 10);
    setCanScrollDown(contentOffset.y < contentSize.height - layoutMeasurement.height - 10);

    if (isAppending.current || filteredFoods.length === 0) return;
    const totalHeight = reps * filteredFoods.length * itemHeight;
    if (contentOffset.y + layoutMeasurement.height >= totalHeight - 100) {
      isAppending.current = true;
      setReps((r) => r + 1);
    }
  }, [filteredFoods, itemHeight, reps]);

  function handleNavigate(direction: 'up' | 'down') {
    const currentIndex = Math.round(scrollY / itemHeight);
    const nextIndex = direction === 'down' ? currentIndex + 1 : currentIndex - 1;
    const maxIndex = Math.max(0, Math.ceil(contentHeight / itemHeight) - 1);
    const targetIndex = Math.max(0, Math.min(nextIndex, maxIndex));
    listRef.current?.scrollToOffset({ offset: targetIndex * itemHeight, animated: true });
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
          <TouchableOpacity style={styles.iconButton} onPress={() => setSearchOpen((s) => !s)}>
            {searchOpen ? <X size={18} color={colors.white} /> : <Search size={18} color={colors.white} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => user ? navigation.navigate('MainTabs' as never) : navigation.navigate('Auth', { mode: 'signin' })}>
            <User size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {searchOpen && (
        <View style={[styles.searchBar, { top: insets.top + 56 }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search dishes..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      )}

      {!searchOpen && (
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
  searchBar: { position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center', zIndex: 25 },
  searchInput: { backgroundColor: 'rgba(0,0,0,0.6)', color: colors.white, borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: '100%' },
});
