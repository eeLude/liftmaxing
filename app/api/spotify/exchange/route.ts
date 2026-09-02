import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

export async function POST(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!clientId || !clientSecret || !redirectUri || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Spotify is not configured." },
      { status: 503 }
    );
  }

  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { code?: string; verifier?: string };
  try {
    body = (await request.json()) as { code?: string; verifier?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.code || !body.verifier) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: body.code,
    redirect_uri: redirectUri,
    code_verifier: body.verifier,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: params,
  });

  const data = (await tokenRes.json()) as TokenResponse;
  if (!tokenRes.ok || !data.refresh_token) {
    return NextResponse.json(
      { error: data.error_description ?? data.error ?? "Could not connect Spotify." },
      { status: 400 }
    );
  }

  return NextResponse.json({ refreshToken: data.refresh_token });
}
