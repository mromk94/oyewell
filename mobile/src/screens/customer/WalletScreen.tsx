import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import { fetchBalance, fetchPaymentMethods, formatPrice, type PaymentMethod } from '../../lib/api';

export function WalletScreen() {
  const { user } = useAuth();
  const [balanceKobo, setBalanceKobo] = useState(0);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBalance(), fetchPaymentMethods()])
      .then(([balanceData, methodsData]) => {
        setBalanceKobo(balanceData.balanceKobo);
        setMethods(methodsData.methods.filter((m) => m.isEnabled));
      })
      .catch(() => setBalanceKobo(user?.balanceKobo ?? 0))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available balance</Text>
        {loading ? <ActivityIndicator color={colors.brand100} /> : <Text style={styles.balance}>{formatPrice(balanceKobo)}</Text>}
      </View>

      <Text style={styles.section}>Payment methods</Text>
      <FlatList
        data={methods}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.method}>
            <Text style={styles.methodName}>{item.name}</Text>
            <Text style={styles.methodProvider}>{item.provider}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.md },
  balanceCard: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.lg },
  balanceLabel: { color: colors.muted, marginBottom: spacing.sm },
  balance: { color: colors.white, fontSize: fontSizes.hero, fontWeight: '700' },
  section: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '600', marginBottom: spacing.md },
  method: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.md, marginBottom: spacing.md },
  methodName: { color: colors.white, fontWeight: '600' },
  methodProvider: { color: colors.muted, marginTop: spacing.xs },
});
