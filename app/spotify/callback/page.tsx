"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingStates";
import { takePkceFromStorage } from "@/lib/spotify";
import { upsertSpotifyRefreshToken } from "@/lib/queries";

export default function SpotifyCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Connecting Spotify…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const code = params.get("code");
    const state = params.get("state");

    if (error) {
      setMessage("Spotify access was denied.");
      const t = window.setTimeout(() => router.replace("/"), 2000);
      return () => window.clearTimeout(t);
    }

    const pkce = takePkceFromStorage(state);
    if (!code || !pkce) {
      setMessage("Spotify login expired. Try Connect again.");
      const t = window.setTimeout(() => router.replace("/"), 2000);
      return () => window.clearTimeout(t);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/spotify/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, verifier: pkce.verifier }),
        });
        const data = (await res.json()) as {
          refreshToken?: string;
          error?: string;
        };
        if (!res.ok || !data.refreshToken) {
          throw new Error(data.error ?? "Could not connect Spotify.");
        }
        await upsertSpotifyRefreshToken(data.refreshToken);
        if (!cancelled) router.replace("/");
      } catch (err) {
        if (cancelled) return;
        setMessage(
          err instanceof Error ? err.message : "Could not connect Spotify."
        );
        window.setTimeout(() => router.replace("/"), 2500);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-400">
      <LoadingSpinner className="h-6 w-6" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
