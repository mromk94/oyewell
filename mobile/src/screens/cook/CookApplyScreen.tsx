import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Switch, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { applyAsCook } from '../../lib/cookApi';
import { pickImage } from '../../lib/imagePicker';
import { getCurrentAddress } from '../../lib/location';
import { ChefHat, Camera, MapPin, ArrowLeft, ArrowRight, X } from 'lucide-react-native';

type Safety = {
  hygiene: boolean;
  allergens: boolean;
  temperature: boolean;
  labeling: boolean;
};

export function CookApplyScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [cuisineSpecialty, setCuisineSpecialty] = useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = useState('5');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [categories, setCategories] = useState('');
  const [signatureDishes, setSignatureDishes] = useState('');
  const [capacity, setCapacity] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [packagingPhotos, setPackagingPhotos] = useState<string[]>([]);
  const [safety, setSafety] = useState<Safety>({ hygiene: false, allergens: false, temperature: false, labeling: false });

  async function pickProfilePhoto() {
    const image = await pickImage();
    if (image) setProfilePhoto(image);
  }

  async function addPackagingPhoto() {
    const image = await pickImage();
    if (image) setPackagingPhotos((prev) => [...prev, image]);
  }

  async function useMyLocation() {
    const result = await getCurrentAddress();
    if (result) {
      setNeighborhood(result.address);
      setLatitude(String(result.lat));
      setLongitude(String(result.lng));
    } else {
      setError('Could not get location. Make sure location permission is granted.');
    }
  }

  function toggleSafety(key: keyof Safety) {
    setSafety((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleApply() {
    if (!displayName.trim()) {
      setError('Kitchen / display name is required');
      return;
    }
    if (!neighborhood.trim()) {
      setError('Neighborhood is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await applyAsCook({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        cuisineSpecialty: cuisineSpecialty.trim() || undefined,
        serviceRadiusKm: Number(serviceRadiusKm) || 5,
        profilePhoto: profilePhoto || undefined,
        categories: categories.split(',').map((c) => c.trim()).filter(Boolean),
        signatureDishes: signatureDishes.split(',').map((c) => c.trim()).filter(Boolean),
        capacity: capacity.trim() || undefined,
        prepTime: prepTime.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        packagingPhotos,
        safetyAcknowledgements: (Object.entries(safety).filter(([, v]) => v).map(([k]) => k) as string[]),
      });
      Alert.alert('Application received', 'We will review your application shortly.');
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
        <View style={styles.closeRow}>
          <TouchableOpacity style={styles.close} onPress={() => navigation.goBack()}>
            <X size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.icon}>
          <ChefHat size={40} color={colors.brand900} />
        </View>
        <Text style={styles.title}>Become an OyeWell Cook</Text>
        <Text style={styles.body}>Apply to cook and sell food in your neighborhood.</Text>
        {error && <Text style={styles.error}>{error}</Text>}

        {step === 1 ? (
          <View>
            <Text style={styles.step}>Step 1 of 2</Text>
            <TextInput style={styles.input} placeholder="Kitchen / display name" placeholderTextColor={colors.muted} value={displayName} onChangeText={setDisplayName} />
            <TextInput style={styles.input} placeholder="What you cook (cuisine)" placeholderTextColor={colors.muted} value={cuisineSpecialty} onChangeText={setCuisineSpecialty} />
            <TextInput style={styles.input} placeholder="Delivery radius (km)" placeholderTextColor={colors.muted} value={serviceRadiusKm} onChangeText={setServiceRadiusKm} keyboardType="numeric" />

            <TouchableOpacity style={styles.photoButton} onPress={pickProfilePhoto}>
              <Camera size={18} color={colors.brand900} />
              <Text style={styles.photoButtonText}>{profilePhoto ? 'Change profile photo' : 'Add profile photo'}</Text>
            </TouchableOpacity>
            {profilePhoto ? <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} /> : null}

            <TextInput style={styles.input} placeholder="Categories (comma separated)" placeholderTextColor={colors.muted} value={categories} onChangeText={setCategories} />
            <TextInput style={styles.input} placeholder="Signature dishes (comma separated)" placeholderTextColor={colors.muted} value={signatureDishes} onChangeText={setSignatureDishes} />
            <TextInput style={styles.input} placeholder="Capacity (e.g. 20 meals/day)" placeholderTextColor={colors.muted} value={capacity} onChangeText={setCapacity} />
            <TextInput style={styles.input} placeholder="Average prep time" placeholderTextColor={colors.muted} value={prepTime} onChangeText={setPrepTime} />
            <TextInput style={styles.input} placeholder="Neighborhood (e.g. Yaba, Ikeja GRA)" placeholderTextColor={colors.muted} value={neighborhood} onChangeText={setNeighborhood} />

            <View style={styles.row}>
              <TextInput style={[styles.input, styles.half]} placeholder="Latitude" placeholderTextColor={colors.muted} value={latitude} onChangeText={setLatitude} keyboardType="numeric" />
              <TextInput style={[styles.input, styles.half]} placeholder="Longitude" placeholderTextColor={colors.muted} value={longitude} onChangeText={setLongitude} keyboardType="numeric" />
            </View>
            <TouchableOpacity style={styles.locationButton} onPress={useMyLocation}>
              <MapPin size={18} color={colors.brand100} />
              <Text style={styles.locationButtonText}>Use my location</Text>
            </TouchableOpacity>

            <TextInput style={styles.input} placeholder="Tell customers about your kitchen" placeholderTextColor={colors.muted} value={bio} onChangeText={setBio} multiline />

            <TouchableOpacity style={styles.next} onPress={() => setStep(2)}>
              <Text style={styles.nextText}>Continue</Text>
              <ArrowRight size={18} color={colors.brand900} />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.step}>Step 2 of 2</Text>
            <Text style={styles.section}>Packaging & safety</Text>

            <TouchableOpacity style={styles.photoButton} onPress={addPackagingPhoto}>
              <Camera size={18} color={colors.brand900} />
              <Text style={styles.photoButtonText}>Add packaging photo</Text>
            </TouchableOpacity>
            {packagingPhotos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.packagingPhoto} />
            ))}

            <View style={styles.safety}>
              {[
                { key: 'hygiene', label: 'I follow good food hygiene practices' },
                { key: 'allergens', label: 'I handle allergens safely and label them' },
                { key: 'temperature', label: 'I keep hot and cold foods at safe temperatures' },
                { key: 'labeling', label: 'I label packages with contents and date' },
              ].map(({ key, label }) => (
                <View key={key} style={styles.safetyRow}>
                  <Switch value={safety[key as keyof Safety]} onValueChange={() => toggleSafety(key as keyof Safety)} trackColor={{ false: colors.brand800, true: colors.brand100 }} thumbColor={colors.white} />
                  <Text style={styles.safetyText}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.row}>
              <TouchableOpacity style={styles.back} onPress={() => setStep(1)}>
                <ArrowLeft size={18} color={colors.white} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submit} onPress={handleApply} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.brand900} /> : <Text style={styles.submitText}>Submit application</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  closeRow: { alignItems: 'flex-end', marginBottom: spacing.sm },
  close: { padding: spacing.sm },
  icon: { backgroundColor: colors.brand100, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.md },
  title: { color: colors.white, fontSize: fontSizes.xxl, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  body: { color: colors.muted, textAlign: 'center', marginBottom: spacing.md },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  step: { color: colors.brand100, textAlign: 'center', marginBottom: spacing.md, fontWeight: '600' },
  section: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '700', marginBottom: spacing.md },
  input: { backgroundColor: colors.brand800, color: colors.white, padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  half: { flex: 1 },
  photoButton: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  photoButtonText: { color: colors.brand900, fontWeight: '700' },
  profilePhoto: { width: '100%', height: 180, borderRadius: radii.lg, marginBottom: spacing.md, backgroundColor: colors.brand800 },
  packagingPhoto: { width: '100%', height: 120, borderRadius: radii.lg, marginBottom: spacing.md, backgroundColor: colors.brand800 },
  locationButton: { backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  locationButtonText: { color: colors.brand100, fontWeight: '600' },
  next: { backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  nextText: { color: colors.brand900, fontWeight: '700' },
  safety: { marginBottom: spacing.md },
  safetyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  safetyText: { color: colors.white, flex: 1 },
  back: { flex: 1, backgroundColor: colors.brand800, padding: spacing.md, borderRadius: radii.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  backText: { color: colors.white, fontWeight: '700' },
  submit: { flex: 1, backgroundColor: colors.brand100, padding: spacing.md, borderRadius: radii.full, alignItems: 'center' },
  submitText: { color: colors.brand900, fontWeight: '700' },
});
