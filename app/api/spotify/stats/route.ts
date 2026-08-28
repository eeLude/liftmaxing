import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { mapSpotifyStats, parseSpotifyTimeRange } from "@/lib/spotify";
import type { Database } from "@/types/database";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
};

type Paging<T> = { items?: T[] };

function supabaseForUser(accessToken: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

async function refreshSpotifyAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: params,
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) return null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
  };
}

export async function GET(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Spotify is not configured." },
      { status: 503 }
    );
  }

  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = supabaseForUser(jwt);
  const { data: row, error } = await supabase
    .from("spotify_tokens")
    .select("refresh_token")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error:
          "Could not load Spotify. Run supabase/migrate-spotify.sql if the table is missing.",
      },
      { status: 500 }
    );
  }
  if (!row) {
    return NextResponse.json({ connected: false }, { status: 404 });
  }

  const refreshed = await refreshSpotifyAccessToken(
    clientId,
    clientSecret,
    row.refresh_token
  );
  if (!refreshed) {
    await supabase.from("spotify_tokens").delete();
    return NextResponse.json({ connected: false }, { status: 404 });
  }

  if (refreshed.refreshToken !== row.refresh_token) {
    await supabase
      .from("spotify_tokens")
      .update({
        refresh_token: refreshed.refreshToken,
        updated_at: new Date().toISOString(),
      })
      .eq("refresh_token", row.refresh_token);
  }

  const timeRange = parseSpotifyTimeRange(
    request.nextUrl.searchParams.get("time_range")
  );

  const headers = { Authorization: `Bearer ${refreshed.accessToken}` };
  const [artistsRes, tracksRes] = await Promise.all([
    fetch(
      `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=10`,
      { headers }
    ),
    fetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=5`,
      { headers }
    ),
  ]);

  if (!artistsRes.ok || !tracksRes.ok) {
    return NextResponse.json(
      { error: "Could not load Spotify stats." },
      { status: 502 }
    );
  }

  const artistsJson = (await artistsRes.json()) as Paging<{
    id: string;
    name: string;
    genres?: string[];
    images?: { url: string }[];
  }>;
  const tracksJson = (await tracksRes.json()) as Paging<{
    id: string;
    name: string;
    artists?: { name: string }[];
  }>;

  return NextResponse.json({
    connected: true,
    ...mapSpotifyStats(artistsJson.items ?? [], tracksJson.items ?? []),
  });
}
