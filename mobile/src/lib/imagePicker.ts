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
  return result.assets[0]?.base64 ?? result.assets[0]?.uri ?? null;
}
