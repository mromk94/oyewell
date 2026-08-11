export interface FavoriteCook {
  id: string;
  displayName: string;
  profilePhoto?: string | null;
}

const KEY = 'oye_favorite_cooks';

function getAll(): FavoriteCook[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteCook[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(all: FavoriteCook[]) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getFavoriteCooks(): FavoriteCook[] {
  return getAll();
}

export function isFavoriteCook(id: string): boolean {
  return getAll().some((c) => c.id === id);
}

export function addFavoriteCook(cook: FavoriteCook): FavoriteCook[] {
  const all = getAll();
  if (all.some((c) => c.id === cook.id)) return all;
  const next = [...all, cook];
  save(next);
  return next;
}

export function removeFavoriteCook(id: string): FavoriteCook[] {
  const next = getAll().filter((c) => c.id !== id);
  save(next);
  return next;
}

export function toggleFavoriteCook(cook: FavoriteCook): { favorited: boolean; cooks: FavoriteCook[] } {
  const all = getAll();
  const exists = all.some((c) => c.id === cook.id);
  if (exists) {
    const next = removeFavoriteCook(cook.id);
    return { favorited: false, cooks: next };
  }
  const next = addFavoriteCook(cook);
  return { favorited: true, cooks: next };
}
