import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../theme';
import { Logo } from '../components/Logo';
import type { RootStackParamList } from '../navigation/AppNavigator';

export function LandingScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <Logo />
        <Text style={styles.headline}>Home-cooked food, close by.</Text>
        <Text style={styles.body}>
          Discover dishes from local home cooks, order for delivery or pickup, and track every step.
        </Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Auth', { mode: 'register' })}>
          <Text style={styles.primaryText}>Create account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Auth', { mode: 'signin' })}>
          <Text style={styles.secondaryText}>Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghost} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.ghostText}>Explore without an account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, justifyContent: 'center', padding: spacing.md },
  hero: { alignItems: 'center', marginBottom: spacing.xxl },
  headline: { color: colors.white, fontSize: fontSizes.hero, fontWeight: '800', textAlign: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  body: { color: colors.muted, fontSize: fontSizes.lg, textAlign: 'center', lineHeight: 26, maxWidth: 320 },
  card: { backgroundColor: colors.brand800, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  primaryButton: { backgroundColor: colors.white, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  primaryText: { color: colors.black, fontSize: fontSizes.base, fontWeight: '700' },
  secondaryButton: { backgroundColor: 'transparent', padding: spacing.md, borderRadius: radii.full, alignItems: 'center', borderWidth: 1, borderColor: colors.white20 },
  secondaryText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  ghost: { padding: spacing.sm, alignItems: 'center' },
  ghostText: { color: colors.muted, fontSize: fontSizes.sm },
});
