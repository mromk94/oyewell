import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@oye_favorite_cooks';

export interface FavoriteCook {
  id: string;
  displayName: string;
  profilePhoto?: string | null;
}

async function getAll(): Promise<FavoriteCook[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteCook[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function save(all: FavoriteCook[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function getFavoriteCooks(): Promise<FavoriteCook[]> {
  return getAll();
}

export async function isFavoriteCook(id: string): Promise<boolean> {
  const all = await getAll();
  return all.some((c) => c.id === id);
}

export async function addFavoriteCook(cook: FavoriteCook): Promise<FavoriteCook[]> {
  const all = await getAll();
  if (all.some((c) => c.id === cook.id)) return all;
  const next = [...all, cook];
  await save(next);
  return next;
}

export async function removeFavoriteCook(id: string): Promise<FavoriteCook[]> {
  const next = (await getAll()).filter((c) => c.id !== id);
  await save(next);
  return next;
}

export async function toggleFavoriteCook(cook: FavoriteCook): Promise<{ favorited: boolean; cooks: FavoriteCook[] }> {
  const all = await getAll();
  const exists = all.some((c) => c.id === cook.id);
  if (exists) {
    const next = await removeFavoriteCook(cook.id);
    return { favorited: false, cooks: next };
  }
  const next = await addFavoriteCook(cook);
  return { favorited: true, cooks: next };
}
