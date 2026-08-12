import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { fetchFoods, type FoodItem } from '../../lib/api';
import { FoodCard } from '../../components/FoodCard';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFoods()
      .then(({ foods }) => setFoods(foods))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load foods'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>OYE Well</Text>
        {user && <Text style={styles.subtitle}>Hello, {user.firstName || user.email}</Text>}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand100} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <FoodCard
              food={item}
              onPress={() => navigation.navigate('Food', { slug: item.slug })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900 },
  header: { padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700' },
  subtitle: { color: colors.brand100, marginTop: spacing.xs },
  list: { padding: spacing.md },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.md },
});
