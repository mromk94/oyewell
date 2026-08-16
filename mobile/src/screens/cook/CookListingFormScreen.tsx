import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { pickImage } from '../../lib/imagePicker';
import { createCookListing, updateCookListing, uploadCookMedia, type CookListing, type CookListingInput } from '../../lib/cookApi';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { X, Plus, Upload, Image as ImageIcon, Video } from 'lucide-react-native';

type MediaItem = { id?: string; type: 'IMAGE' | 'VIDEO'; url: string; isUpload?: boolean };

export function CookListingFormScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'CookListingForm'>>();
  const listing = params?.listing;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: listing?.title ?? '',
    description: listing?.description ?? '',
    price: listing ? (listing.priceKobo / 100).toFixed(2) : '',
    portionDescription: listing?.portionDescription ?? '',
    prepTime: listing?.prepTimeMinutesMax ? String(listing.prepTimeMinutesMax) : '',
    quantity: listing ? String(listing.quantity ?? listing.stock ?? '') : '',
    ingredients: listing?.ingredients ?? '',
    allergens: listing?.allergens ?? '',
    cuisine: listing?.cuisine ?? '',
  });

  const [media, setMedia] = useState<MediaItem[]>(
    listing?.media.map((m) => ({ id: m.id, type: m.type, url: m.url })) ?? []
  );
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePickImage() {
    const picked = await pickImage();
    if (picked) {
      setMedia((prev) => [...prev, { type: 'IMAGE', url: picked, isUpload: true }]);
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function addUrlMedia() {
    const url = newMediaUrl.trim();
    if (!url) return;
    setMedia((prev) => [...prev, { type: newMediaType, url }]);
    setNewMediaUrl('');
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Food name is required');
      return;
    }
    const priceKobo = Math.round(Number(form.price) * 100);
    if (Number.isNaN(priceKobo) || priceKobo <= 0) {
      setError('A valid price is required');
      return;
    }
    const quantity = Number(form.quantity) || 0;
    if (quantity <= 0) {
      setError('How many can you make? is required');
      return;
    }
    setLoading(true);
    setError(null);
    setUploading(true);
    try {
      const finalMedia: { id?: string; type: 'IMAGE' | 'VIDEO'; url: string }[] = [];
      for (const m of media) {
        if (m.isUpload) {
          const uploaded = await uploadCookMedia(m.url, m.type);
          finalMedia.push({ type: uploaded.type, url: uploaded.url });
        } else {
          finalMedia.push({ id: m.id, type: m.type, url: m.url });
        }
      }

      const body: CookListingInput = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priceKobo,
        portionDescription: form.portionDescription.trim() || undefined,
        prepTimeMinutesMin: undefined,
        prepTimeMinutesMax: form.prepTime ? Number(form.prepTime) : undefined,
        stock: quantity,
        quantity,
        ingredients: form.ingredients.trim() || undefined,
        allergens: form.allergens.trim() || undefined,
        cuisine: form.cuisine.trim() || undefined,
        media: finalMedia,
      };

      if (listing) {
        const shouldResubmit = !['APPROVED', 'PAUSED'].includes(listing.status);
        await updateCookListing(listing.id, { ...body, resubmit: shouldResubmit });
      } else {
        await createCookListing(body);
      }
      navigation.navigate('MainTabs', { screen: 'Listings' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setUploading(false);
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{listing ? 'Edit food' : 'Add a new food'}</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {error && <Text style={styles.error}>{error}</Text>}
        {uploading && <Text style={styles.uploading}>Uploading your media…</Text>}

        <TextInput style={styles.input} placeholder="Food name" placeholderTextColor={colors.muted} value={form.title} onChangeText={(v) => update('title', v)} />
        <TextInput
          style={styles.input}
          placeholder="Price (NGN)"
          placeholderTextColor={colors.muted}
          value={form.price}
          onChangeText={(v) => update('price', v)}
          keyboardType="decimal-pad"
        />
        <TextInput style={styles.input} placeholder="Portion (e.g., 1 plate)" placeholderTextColor={colors.muted} value={form.portionDescription} onChangeText={(v) => update('portionDescription', v)} />
        <TextInput
          style={styles.input}
          placeholder="Preparation time (minutes)"
          placeholderTextColor={colors.muted}
          value={form.prepTime}
          onChangeText={(v) => update('prepTime', v)}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="How many can you make?"
          placeholderTextColor={colors.muted}
          value={form.quantity}
          onChangeText={(v) => update('quantity', v)}
          keyboardType="numeric"
        />
        <TextInput style={styles.input} placeholder="Cuisine (e.g., Nigerian)" placeholderTextColor={colors.muted} value={form.cuisine} onChangeText={(v) => update('cuisine', v)} />
        <TextInput style={styles.input} placeholder="Main ingredients" placeholderTextColor={colors.muted} value={form.ingredients} onChangeText={(v) => update('ingredients', v)} />
        <TextInput style={styles.input} placeholder="Allergens" placeholderTextColor={colors.muted} value={form.allergens} onChangeText={(v) => update('allergens', v)} />
        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Description"
          placeholderTextColor={colors.muted}
          value={form.description}
          onChangeText={(v) => update('description', v)}
          multiline
        />

        <View style={styles.mediaPanel}>
          <Text style={styles.mediaTitle}>Food photos or videos</Text>

          {media.length > 0 && (
            <ScrollView
              nestedScrollEnabled
              style={styles.mediaGrid}
              contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
            >
              {media.map((m, i) => (
                <View key={`${m.url}-${i}`} style={styles.mediaThumb}>
                  {m.type === 'VIDEO' ? (
                    <View style={styles.videoPlaceholder}>
                      <Video size={24} color={colors.white} />
                    </View>
                  ) : (
                    <Image source={{ uri: m.url }} style={styles.mediaImage} />
                  )}
                  <TouchableOpacity style={styles.removeMedia} onPress={() => removeMedia(i)}>
                    <X size={14} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
            <Upload size={20} color={colors.brand100} />
            <Text style={styles.uploadButtonText}>Tap to upload photo</Text>
          </TouchableOpacity>

          <View style={styles.urlRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Or paste a media URL"
              placeholderTextColor={colors.muted}
              value={newMediaUrl}
              onChangeText={setNewMediaUrl}
            />
            <View style={styles.typeSwitch}>
              <TouchableOpacity
                style={[styles.typeButton, newMediaType === 'IMAGE' && styles.typeButtonActive]}
                onPress={() => setNewMediaType('IMAGE')}
              >
                <ImageIcon size={14} color={newMediaType === 'IMAGE' ? colors.brand900 : colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, newMediaType === 'VIDEO' && styles.typeButtonActive]}
                onPress={() => setNewMediaType('VIDEO')}
              >
                <Video size={14} color={newMediaType === 'VIDEO' ? colors.brand900 : colors.white} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addUrl} onPress={addUrlMedia}>
              <Plus size={18} color={colors.brand900} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.save} onPress={handleSave} disabled={loading || uploading}>
          {loading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.saveText}>{listing ? 'Save changes' : 'Add food'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800', marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  uploading: { color: colors.brand100, marginBottom: spacing.md, fontWeight: '600' },
  input: { backgroundColor: colors.brand800, color: colors.white, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  mediaPanel: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  mediaTitle: { color: colors.muted, fontSize: fontSizes.sm, marginBottom: spacing.md },
  mediaGrid: { maxHeight: 180, marginBottom: spacing.md },
  mediaThumb: { width: 80, height: 80, borderRadius: radii.md, overflow: 'hidden' },
  mediaImage: { width: '100%', height: '100%' },
  videoPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.brand800, justifyContent: 'center', alignItems: 'center' },
  removeMedia: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radii.full, padding: 4 },
  uploadButton: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  uploadButtonText: { color: colors.brand100, marginTop: spacing.xs, fontWeight: '600' },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeSwitch: { flexDirection: 'row', gap: spacing.xs },
  typeButton: { padding: spacing.sm, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.08)' },
  typeButtonActive: { backgroundColor: colors.brand100 },
  addUrl: { backgroundColor: colors.brand100, padding: spacing.sm, borderRadius: radii.full },
  save: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center', marginTop: spacing.md },
  saveText: { color: colors.brand900, fontWeight: '700' },
});
