import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { pickImage } from '../../lib/imagePicker';
import { createCookListing, updateCookListing, uploadCookMedia, type CookListing, type CookListingInput } from '../../lib/cookApi';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export function CookListingFormScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'CookListingForm'>>();
  const listing = params?.listing;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(listing?.title ?? '');
  const [description, setDescription] = useState(listing?.description ?? '');
  const [price, setPrice] = useState(listing ? String(listing.priceKobo / 100) : '');
  const [stock, setStock] = useState(listing ? String(listing.stock) : '10');
  const [portion, setPortion] = useState(listing?.portionDescription ?? 'plate');
  const [cuisine, setCuisine] = useState(listing?.cuisine ?? '');
  const [ingredients, setIngredients] = useState(listing?.ingredients ?? '');
  const [allergens, setAllergens] = useState(listing?.allergens ?? '');
  const [prepMin, setPrepMin] = useState(listing?.prepTimeMinutesMin ? String(listing.prepTimeMinutesMin) : '');
  const [prepMax, setPrepMax] = useState(listing?.prepTimeMinutesMax ? String(listing.prepTimeMinutesMax) : '');
  const [mediaUrl, setMediaUrl] = useState<string | null>(listing?.media?.[0]?.url ?? null);
  const [error, setError] = useState<string | null>(null);

  async function handlePickImage() {
    const picked = await pickImage();
    if (picked) {
      setMediaUrl(picked);
    }
  }

  async function handleSave() {
    if (!title.trim() || !price.trim() || !stock.trim()) {
      setError('Title, price and stock are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let finalMedia: { type: 'IMAGE' | 'VIDEO'; url: string }[] = [];
      if (mediaUrl && (!listing || mediaUrl !== listing.media?.[0]?.url)) {
        const { media } = await uploadCookMedia(mediaUrl, 'IMAGE');
        finalMedia = [{ type: 'IMAGE', url: media.url }];
      } else if (listing?.media?.[0]?.url) {
        finalMedia = [{ type: listing.media[0].type as 'IMAGE' | 'VIDEO', url: listing.media[0].url }];
      }
      const body: CookListingInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        priceKobo: Math.round(Number(price) * 100),
        stock: Number(stock),
        portionDescription: portion.trim() || undefined,
        cuisine: cuisine.trim() || undefined,
        ingredients: ingredients.trim() || undefined,
        allergens: allergens.trim() || undefined,
        prepTimeMinutesMin: prepMin ? Number(prepMin) : undefined,
        prepTimeMinutesMax: prepMax ? Number(prepMax) : undefined,
        media: finalMedia,
      };
      if (listing) {
        await updateCookListing(listing.id, body);
      } else {
        await createCookListing(body);
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{listing ? 'Edit listing' : 'Add new listing'}</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
          {mediaUrl ? <Image source={{ uri: mediaUrl }} style={styles.image} /> : <Text style={styles.imageButtonText}>Add photo</Text>}
        </TouchableOpacity>

        <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Description" placeholderTextColor={colors.muted} value={description} onChangeText={setDescription} multiline />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} placeholder="Price (NGN)" placeholderTextColor={colors.muted} value={price} onChangeText={setPrice} keyboardType="numeric" />
          <TextInput style={[styles.input, styles.half]} placeholder="Stock" placeholderTextColor={colors.muted} value={stock} onChangeText={setStock} keyboardType="numeric" />
        </View>
        <TextInput style={styles.input} placeholder="Portion description e.g. plate, piece" placeholderTextColor={colors.muted} value={portion} onChangeText={setPortion} />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} placeholder="Prep time min" placeholderTextColor={colors.muted} value={prepMin} onChangeText={setPrepMin} keyboardType="numeric" />
          <TextInput style={[styles.input, styles.half]} placeholder="Prep time max" placeholderTextColor={colors.muted} value={prepMax} onChangeText={setPrepMax} keyboardType="numeric" />
        </View>
        <TextInput style={styles.input} placeholder="Cuisine" placeholderTextColor={colors.muted} value={cuisine} onChangeText={setCuisine} />
        <TextInput style={styles.input} placeholder="Ingredients" placeholderTextColor={colors.muted} value={ingredients} onChangeText={setIngredients} multiline />
        <TextInput style={styles.input} placeholder="Allergens" placeholderTextColor={colors.muted} value={allergens} onChangeText={setAllergens} multiline />

        <TouchableOpacity style={styles.save} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.saveText}>{listing ? 'Update listing' : 'Create listing'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  imageButton: { backgroundColor: colors.brand800, borderRadius: radii.lg, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imageButtonText: { color: colors.brand100, fontWeight: '600' },
  input: { backgroundColor: colors.brand800, color: colors.white, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  save: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center', marginTop: spacing.md },
  saveText: { color: colors.brand900, fontWeight: '700' },
});
