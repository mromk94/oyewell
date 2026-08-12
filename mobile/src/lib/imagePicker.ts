import * as ImagePicker from 'expo-image-picker';

export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if (asset.base64) {
    const mime = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
    return `data:${mime};base64,${asset.base64}`;
  }
  return asset.uri ?? null;
}
