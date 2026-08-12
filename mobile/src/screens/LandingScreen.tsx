import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../theme';
import { Logo } from '../components/Logo';
import type { RootStackParamList } from '../navigation/AppNavigator';

export function LandingScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Logo />
          </View>
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
            <Text style={styles.ghostText}>Browse foods first</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900 },
  content: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg },
  hero: { marginBottom: spacing.xxl },
  logo: { marginBottom: spacing.lg },
  headline: { color: colors.white, fontSize: 36, fontWeight: '800', textAlign: 'left', marginBottom: spacing.md, letterSpacing: -0.5, lineHeight: 40 },
  body: { color: colors.muted, fontSize: fontSizes.lg, textAlign: 'left', lineHeight: 26 },
  card: { backgroundColor: colors.white5, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  primaryButton: { backgroundColor: colors.white, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  primaryText: { color: colors.black, fontSize: fontSizes.base, fontWeight: '700' },
  secondaryButton: { backgroundColor: 'transparent', padding: spacing.md, borderRadius: radii.full, alignItems: 'center', borderWidth: 1, borderColor: colors.white20 },
  secondaryText: { color: colors.white, fontSize: fontSizes.base, fontWeight: '700' },
  ghost: { padding: spacing.sm, alignItems: 'center' },
  ghostText: { color: colors.muted, fontSize: fontSizes.sm },
});
