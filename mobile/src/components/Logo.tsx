import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fontSizes, spacing } from '../theme';

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <View style={styles.container}>
      <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={dark ? colors.black : colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 10h12a2 2 0 0 1 2 2v.5a6.5 6.5 0 0 1-13 0V12a2 2 0 0 1 2-2z" />
        <Path d="M5 10l1-3h12l1 3" />
        <Path d="M7 10v-2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
        <Path d="M8 21h8" />
      </Svg>
      <Text style={[styles.wordmark, { color: dark ? colors.black : colors.white }]}>
        Oye <Text style={styles.light}>Well</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: { fontSize: fontSizes.xxl, fontWeight: '800', letterSpacing: -0.5 },
  light: { fontWeight: '300' },
});
