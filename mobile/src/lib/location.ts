import * as Location from 'expo-location';
import { reverseGeocode } from './api';

export async function getCurrentAddress(): Promise<{ address: string; lat: number; lng: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = position.coords;

  try {
    const location = await reverseGeocode(latitude, longitude);
    const address = [location.address, location.city, location.state].filter(Boolean).join(', ');
    return { address, lat: latitude, lng: longitude };
  } catch {
    return { address: `${latitude}, ${longitude}`, lat: latitude, lng: longitude };
  }
}
