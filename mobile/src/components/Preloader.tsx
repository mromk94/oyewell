import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { ChefHat } from 'lucide-react-native';
import { colors, fontSizes, spacing } from '../theme';

export function Preloader() {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(bounce, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, [bounce]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.badge, { transform: [{ translateY }] }]}>
        <ChefHat size={40} color="#fcd34d" strokeWidth={1.5} />
      </Animated.View>
      <Text style={styles.title}>
        OYE <Text style={styles.titleLight}>Well</Text>
      </Text>
      <Text style={styles.subtitle}>Preparing your experience…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.brand900, justifyContent: 'center', alignItems: 'center', zIndex: 60 },
  badge: { padding: spacing.lg, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', backgroundColor: 'rgba(0,0,0,0.2)' },
  title: { marginTop: spacing.lg, fontSize: fontSizes.xxl, fontWeight: '900', color: colors.white, letterSpacing: -0.5 },
  titleLight: { fontWeight: '300' },
  subtitle: { marginTop: spacing.sm, fontSize: fontSizes.sm, color: 'rgba(253,230,138,0.7)', letterSpacing: 0.5 },
});
