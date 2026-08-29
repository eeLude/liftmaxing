const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FAIL_TTL_MS = 15 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 2500;
export const ITUNES_GENRE_LOOKUP_LIMIT = 10;

type CacheEntry = { genre: string | null; expiresAt: number };
type ItunesArtist = { artistName?: string; primaryGenreName?: string };

const cache = new Map<string, CacheEntry>();

export function artistNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function pickExactItunesGenre(
  artistName: string,
  results: ItunesArtist[]
): string | null {
  const key = artistNameKey(artistName);
  for (const row of results) {
    if (artistNameKey(row.artistName ?? "") !== key) continue;
    const genre = row.primaryGenreName?.trim();
    if (genre) return genre;
  }
  return null;
}

async function fetchItunesGenre(name: string): Promise<string | null> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=musicArtist&limit=5`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: ItunesArtist[] };
  return pickExactItunesGenre(name, data.results ?? []);
}

export async function lookupArtistGenres(
  names: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const now = Date.now();
  const out = new Map<string, string>();
  const missing: string[] = [];

  for (const name of unique) {
    const key = artistNameKey(name);
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) {
      if (hit.genre) out.set(key, hit.genre);
      continue;
    }
    missing.push(name);
  }

  await Promise.all(
    missing.map(async (name) => {
      const key = artistNameKey(name);
      try {
        const genre = await fetchItunesGenre(name);
        cache.set(key, {
          genre,
          expiresAt: now + (genre ? CACHE_TTL_MS : FAIL_TTL_MS),
        });
        if (genre) out.set(key, genre);
      } catch {
        cache.set(key, { genre: null, expiresAt: now + FAIL_TTL_MS });
      }
    })
  );

  return out;
}

export function applyNameGenreLookup<T extends { name: string; genres?: string[] }>(
  artists: T[],
  genresByName: Map<string, string>
): T[] {
  return artists.map((artist) => {
    if ((artist.genres ?? []).length > 0) return artist;
    const genre = genresByName.get(artistNameKey(artist.name));
    if (!genre) return artist;
    return { ...artist, genres: [genre] };
  });
}
