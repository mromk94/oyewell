import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { uploadPaymentProof } from '../../lib/api';
import { pickImage } from '../../lib/imagePicker';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export function PaymentProofScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'PaymentProof'>>();
  const { paymentId, orderNumber, method } = params!;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectImage() {
    const picked = await pickImage();
    if (picked) setImage(picked);
  }

  async function handleUpload() {
    if (!image) {
      setError('Please select a payment proof image');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await uploadPaymentProof(paymentId, image, note);
      navigation.navigate('Track', { orderNumber });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.title}>Payment proof</Text>
        <Text style={styles.order}>Order #{orderNumber}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Pay to: {method.name}</Text>
          <Text style={styles.provider}>{method.provider}</Text>

          {method.provider === 'BANK_TRANSFER' && (
            <View style={styles.details}>
              {method.config?.bankName && (
                <Text style={styles.detail}>Bank name: {method.config.bankName}</Text>
              )}
              {method.config?.accountName && (
                <Text style={styles.detail}>Account name: {method.config.accountName}</Text>
              )}
              {method.publicKey && (
                <Text style={styles.detail}>Account number: {method.publicKey}</Text>
              )}
            </View>
          )}

          {method.provider === 'CRYPTO' && (
            <View style={styles.details}>
              {method.config?.network && (
                <Text style={styles.detail}>Network: {method.config.network}</Text>
              )}
              {method.publicKey && (
                <Text style={[styles.detail, styles.break]}>Wallet address: {method.publicKey}</Text>
              )}
            </View>
          )}

          {method.config?.instructions && (
            <Text style={styles.instructions}>{method.config.instructions}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.imageButton} onPress={selectImage}>
          <Text style={styles.imageButtonText}>{image ? 'Change image' : 'Select proof image'}</Text>
        </TouchableOpacity>

        {image && (
          <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />
        )}

        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor={colors.muted}
          value={note}
          onChangeText={setNote}
          multiline
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleUpload} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.buttonText}>Upload proof</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.sm },
  order: { color: colors.muted, marginBottom: spacing.lg },
  card: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.lg },
  label: { color: colors.muted, marginBottom: spacing.xs },
  provider: { color: colors.brand100, marginBottom: spacing.sm, fontWeight: '600' },
  details: { marginTop: spacing.sm, marginBottom: spacing.sm },
  detail: { color: colors.white, marginBottom: spacing.xs },
  break: { flexWrap: 'wrap' },
  instructions: { color: colors.brand100, lineHeight: 22, marginTop: spacing.sm },
  imageButton: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, alignItems: 'center', marginBottom: spacing.md },
  imageButtonText: { color: colors.brand100, fontWeight: '600' },
  preview: { width: '100%', height: 200, borderRadius: radii.lg, marginBottom: spacing.md, backgroundColor: colors.brand800 },
  input: { backgroundColor: colors.brand800, color: colors.white, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md, minHeight: 80 },
  error: { color: colors.danger, marginBottom: spacing.md },
  button: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  buttonText: { color: colors.brand900, fontWeight: '700' },
});
