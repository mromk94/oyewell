import { prisma } from '../prisma.js';

export async function applyMapSettingsFromDB() {
  try {
    const setting = await prisma.restaurantSetting.findFirst();
    const map = (setting?.mapSettings as Record<string, string | undefined>) ?? {};
    if (map.provider) process.env.GEO_PROVIDER = map.provider;
    if (map.googleMapsApiKey) process.env.GOOGLE_MAPS_API_KEY = map.googleMapsApiKey;
    if (map.mapboxToken) process.env.MAPBOX_TOKEN = map.mapboxToken;
    if (map.publicMapToken) process.env.PUBLIC_MAPBOX_TOKEN = map.publicMapToken;
  } catch {
    // DB may not have the setting yet; env remains in control
  }
}
