"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { HubCard } from "@/components/hub/HubCard";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import { FI_WEEKDAYS, toDateString } from "@/lib/dates";
import { formatLocaleNumber } from "@/lib/utils";
import {
  WEATHER_STALE_MS,
  clearWeatherLocation,
  getWeatherSnapshot,
  loadSavedWeatherLocation,
  lookupPlaceName,
  saveWeatherLocation,
  type WeatherKind,
  type WeatherLocation,
} from "@/lib/weather";

const WEATHER_ICON: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  overcast: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunder: CloudLightning,
};

function weekdayLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const dow = new Date(year, month - 1, day).getDay();
  return FI_WEEKDAYS[(dow + 6) % 7];
}

function WeatherGlyph({
  kind,
  className,
}: {
  kind: WeatherKind;
  className?: string;
}) {
  const Icon = WEATHER_ICON[kind];
  return <Icon className={className} aria-hidden />;
}

export function HubWeatherCard() {
  const [location, setLocation] = useState<WeatherLocation | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoPending, setGeoPending] = useState(false);

  useEffect(() => {
    setLocation(loadSavedWeatherLocation());
    setHydrated(true);
  }, []);

  const weatherQuery = useQuery({
    queryKey: ["weather", location?.lat, location?.lon],
    queryFn: () => getWeatherSnapshot(location!),
    enabled: location != null,
    staleTime: WEATHER_STALE_MS,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Location is not available in this browser.");
      return;
    }
    setGeoError(null);
    setGeoPending(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const name = await lookupPlaceName(lat, lon);
        const next = { lat, lon, name };
        saveWeatherLocation(next);
        setLocation(next);
        setGeoPending(false);
      },
      (err) => {
        setGeoPending(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied."
            : "Could not get location."
        );
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 10 * 60_000 }
    );
  }, []);

  const clearLocation = useCallback(() => {
    clearWeatherLocation();
    setLocation(null);
    setGeoError(null);
  }, []);

  const weather = weatherQuery.data;
  const today = toDateString(new Date());
  const Icon = weather ? WEATHER_ICON[weather.kind] : CloudSun;

  return (
    <HubCard
      title="Weather"
      footer={
        <p className="text-center text-[10px] text-zinc-600">
          Weather data by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-zinc-700 underline-offset-2 hover:text-zinc-400"
          >
            Open-Meteo.com
          </a>
        </p>
      }
    >
      {!hydrated && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}

      {hydrated && !location && (
        <div>
          {geoError && (
            <QueryErrorBanner
              message={geoError}
              onRetry={requestLocation}
            />
          )}
          <button
            type="button"
            onClick={requestLocation}
            disabled={geoPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
          >
            {geoPending ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {geoPending ? "Getting location…" : "Use my location"}
          </button>
        </div>
      )}

      {location && weatherQuery.isError && (
        <QueryErrorBanner
          message="Could not load weather."
          onRetry={() => void weatherQuery.refetch()}
        />
      )}

      {location && weatherQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}

      {weather && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-500">{weather.locationName}</p>
              <p className="text-3xl font-semibold tracking-tight text-zinc-100">
                {weather.currentTemp}°
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {weather.label}
                {" · "}
                {formatLocaleNumber(weather.windMs, 1)} m/s
              </p>
              {weather.feelsLike !== weather.currentTemp && (
                <p className="text-xs text-zinc-500">
                  Feels like {weather.feelsLike}°
                </p>
              )}
            </div>
            <Icon className="h-10 w-10 shrink-0 text-amber-400" aria-hidden />
          </div>
          <button
            type="button"
            onClick={clearLocation}
            className="mt-1 self-start text-xs text-zinc-500 hover:text-zinc-300"
          >
            Change location
          </button>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {weather.days.map((day) => {
              const isToday = day.date === today;
              return (
                <div
                  key={day.date}
                  title={`${day.date} · ${day.label} · ${day.tempMax}° / ${day.tempMin}°`}
                  className={`rounded-lg px-0.5 py-1 ${
                    isToday ? "ring-1 ring-zinc-500" : ""
                  }`}
                >
                  <p className="text-[10px] font-medium uppercase text-zinc-500">
                    {weekdayLabel(day.date)}
                  </p>
                  <WeatherGlyph
                    kind={day.kind}
                    className="mx-auto mt-1 h-4 w-4 text-zinc-300"
                  />
                  <p className="mt-1 text-xs font-medium text-zinc-200">
                    {day.tempMax}°
                  </p>
                  <p className="text-[10px] text-zinc-500">{day.tempMin}°</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </HubCard>
  );
}
