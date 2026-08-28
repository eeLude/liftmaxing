"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { HubCard } from "@/components/hub/HubCard";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import {
  deleteSpotifyConnection,
  hasSpotifyConnection,
} from "@/lib/queries";
import {
  SPOTIFY_TIME_RANGES,
  startSpotifyLogin,
  type SpotifyStats,
  type SpotifyTimeRange,
} from "@/lib/spotify";

const STALE_MS = 30 * 60 * 1000;

async function fetchSpotifyStats(
  accessToken: string,
  timeRange: SpotifyTimeRange
): Promise<SpotifyStats> {
  const res = await fetch(`/api/spotify/stats?time_range=${timeRange}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) {
    throw Object.assign(new Error("not-connected"), { code: "not-connected" });
  }
  if (res.status === 503) {
    throw Object.assign(new Error("not-configured"), { code: "not-configured" });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not load Spotify.");
  }
  return (await res.json()) as SpotifyStats;
}

export function HubSpotifyCard() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const accessToken = session?.access_token;
  const configured = Boolean(process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID);
  const [timeRange, setTimeRange] = useState<SpotifyTimeRange>("short_term");

  const connectedQuery = useQuery({
    queryKey: ["spotify-connected"],
    queryFn: hasSpotifyConnection,
  });

  const statsQuery = useQuery({
    queryKey: ["spotify-stats", timeRange],
    queryFn: () => fetchSpotifyStats(accessToken!, timeRange),
    enabled: Boolean(accessToken && connectedQuery.data === true),
    staleTime: STALE_MS,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const disconnect = useMutation({
    mutationFn: deleteSpotifyConnection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["spotify-connected"] });
      void queryClient.removeQueries({ queryKey: ["spotify-stats"] });
    },
  });

  const stats = statsQuery.data;
  const notConnectedError =
    statsQuery.error != null &&
    (statsQuery.error as { code?: string }).code === "not-connected";
  const connected = connectedQuery.data === true && !notConnectedError;
  const showConnect =
    configured && !connectedQuery.isLoading && !stats && !connected;
  const otherGenres = (stats?.genres ?? []).filter(
    (genre) => genre !== stats?.topGenre
  );

  return (
    <HubCard
      title="Spotify"
      footer={
        connected ? (
          <button
            type="button"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-60"
          >
            {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : null
      }
    >
      {!configured && (
        <p className="text-sm text-zinc-500">
          Add Spotify keys to .env.local to connect.
        </p>
      )}

      {configured && connectedQuery.isError && (
        <QueryErrorBanner
          message="Could not load Spotify. Run supabase/migrate-spotify.sql if the table is missing."
          onRetry={() => void connectedQuery.refetch()}
        />
      )}

      {configured && connectedQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}

      {configured && connected && statsQuery.isLoading && !stats && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}

      {configured &&
        statsQuery.isError &&
        !notConnectedError &&
        (statsQuery.error as { code?: string }).code !== "not-configured" && (
          <QueryErrorBanner
            message={
              statsQuery.error instanceof Error
                ? statsQuery.error.message
                : "Could not load Spotify."
            }
            onRetry={() => void statsQuery.refetch()}
          />
        )}

      {showConnect && (
        <div>
          <p className="mb-3 text-sm text-zinc-500">
            Listening stats from Spotify.
          </p>
          <button
            type="button"
            onClick={() => void startSpotifyLogin()}
            className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
          >
            Connect Spotify
          </button>
        </div>
      )}

      {stats && (
        <div>
          {stats.topGenre ? (
            <>
              <p className="text-3xl font-semibold capitalize tracking-tight text-zinc-100">
                {stats.topGenre}
              </p>
              <p className="text-sm text-zinc-500">top genre</p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Listening stats</p>
          )}
          <div className="mt-3 flex rounded-lg bg-zinc-800 p-0.5">
            {SPOTIFY_TIME_RANGES.map((range) => {
              const active = range.id === timeRange;
              return (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => setTimeRange(range.id)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium ${
                    active
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
          {statsQuery.isFetching && (
            <p className="mt-2 text-xs text-zinc-600">Updating…</p>
          )}
          {stats.artists.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {stats.artists.map((artist) => (
                <div
                  key={artist.id}
                  className="flex w-14 shrink-0 flex-col items-center gap-1"
                  title={artist.name}
                >
                  {artist.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.imageUrl}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-zinc-800" />
                  )}
                  <p className="w-full truncate text-center text-[10px] text-zinc-300">
                    {artist.name}
                  </p>
                </div>
              ))}
            </div>
          )}
          {stats.tracks.length > 0 && (
            <ol className="mt-4 space-y-1.5">
              {stats.tracks.map((track, i) => (
                <li key={track.id} className="flex gap-2 text-sm">
                  <span className="w-4 shrink-0 text-zinc-600">{i + 1}</span>
                  <span className="min-w-0 truncate text-zinc-200">
                    {track.name}
                    <span className="text-zinc-500"> · {track.artist}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {otherGenres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {otherGenres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] capitalize text-zinc-300"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
          {stats.artists.length === 0 && stats.tracks.length === 0 && (
            <p className="mt-2 text-sm text-zinc-500">
              Listen for a while and stats will show up here.
            </p>
          )}
        </div>
      )}
    </HubCard>
  );
}
