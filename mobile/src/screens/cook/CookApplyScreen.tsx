import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { applyAsCook } from '../../lib/cookApi';
import { ChefHat } from 'lucide-react-native';

export function CookApplyScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [radius, setRadius] = useState('5');
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await applyAsCook({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        cuisineSpecialty: cuisine.trim() || undefined,
        serviceRadiusKm: radius ? Number(radius) : 5,
      });
      Alert.alert('Application submitted', 'We will review your application shortly.');
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Application failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.icon}>
          <ChefHat size={40} color={colors.brand900} />
        </View>
        <Text style={styles.title}>Become a cook</Text>
        <Text style={styles.body}>Share your food with neighbors. Submit your details and we'll review your application.</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <TextInput style={styles.input} placeholder="Kitchen name" placeholderTextColor={colors.muted} value={displayName} onChangeText={setDisplayName} />
        <TextInput style={styles.input} placeholder="Bio" placeholderTextColor={colors.muted} value={bio} onChangeText={setBio} multiline />
        <TextInput style={styles.input} placeholder="Cuisine specialty" placeholderTextColor={colors.muted} value={cuisine} onChangeText={setCuisine} />
        <TextInput style={styles.input} placeholder="Service radius (km)" placeholderTextColor={colors.muted} value={radius} onChangeText={setRadius} keyboardType="numeric" />
        <TouchableOpacity style={styles.apply} onPress={handleApply} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.applyText}>Apply</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900 },
  content: { padding: spacing.md },
  icon: { backgroundColor: colors.brand100, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  body: { color: colors.muted, textAlign: 'center', marginBottom: spacing.md },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  input: { backgroundColor: colors.brand800, color: colors.white, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  apply: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center', marginTop: spacing.md },
  applyText: { color: colors.brand900, fontWeight: '700' },
});
