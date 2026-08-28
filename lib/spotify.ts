export const SPOTIFY_SCOPES = "user-top-read";
export const PKCE_VERIFIER_KEY = "spotify_pkce_verifier";
export const PKCE_STATE_KEY = "spotify_pkce_state";

export type SpotifyTimeRange = "short_term" | "medium_term" | "long_term";

export const SPOTIFY_TIME_RANGES: {
  id: SpotifyTimeRange;
  label: string;
}[] = [
  { id: "short_term", label: "4 wk" },
  { id: "medium_term", label: "6 mo" },
  { id: "long_term", label: "Year" },
];

export function parseSpotifyTimeRange(value: string | null): SpotifyTimeRange {
  if (value === "medium_term" || value === "long_term") return value;
  return "short_term";
}

export type SpotifyArtist = {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
};

export type SpotifyTrack = {
  id: string;
  name: string;
  artist: string;
};

export type SpotifyStats = {
  artists: SpotifyArtist[];
  tracks: SpotifyTrack[];
  genres: string[];
  topGenre: string | null;
};

type SpotifyImage = { url: string };
type SpotifyApiArtist = {
  id: string;
  name: string;
  genres?: string[];
  images?: SpotifyImage[];
};
type SpotifyApiTrack = {
  id: string;
  name: string;
  artists?: { name: string }[];
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function startSpotifyLogin() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("Spotify is not configured.");
  }

  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const challenge = base64UrlEncode(new Uint8Array(digest));
  const state = base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));

  const redirectOrigin = new URL(redirectUri).origin;
  if (redirectOrigin !== window.location.origin) {
    window.alert(
      `Open the app at ${redirectOrigin} to connect Spotify (this address will not work).`
    );
    return;
  }

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export function takePkceFromStorage(stateFromUrl: string | null): {
  verifier: string;
} | null {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const state = sessionStorage.getItem(PKCE_STATE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
  if (!verifier || !state || !stateFromUrl || state !== stateFromUrl) {
    return null;
  }
  return { verifier };
}

export function mapSpotifyStats(
  artistItems: SpotifyApiArtist[],
  trackItems: SpotifyApiTrack[]
): SpotifyStats {
  const artists: SpotifyArtist[] = artistItems.slice(0, 5).map((artist) => ({
    id: artist.id,
    name: artist.name,
    imageUrl: artist.images?.[0]?.url ?? null,
    genres: artist.genres ?? [],
  }));

  const tracks: SpotifyTrack[] = trackItems.slice(0, 5).map((track) => ({
    id: track.id,
    name: track.name,
    artist: (track.artists ?? []).map((a) => a.name).join(", "),
  }));

  const counts = new Map<string, number>();
  for (const artist of artistItems) {
    for (const genre of artist.genres ?? []) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  const genres = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([genre]) => genre);

  return { artists, tracks, genres, topGenre: genres[0] ?? null };
}
