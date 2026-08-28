export const WEATHER_STALE_MS = 30 * 60 * 1000;
export const WEATHER_LOCATION_KEY = "liftmaxxing.weatherLocation";

export type WeatherKind =
  | "clear"
  | "partly"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

export type WeatherLocation = {
  lat: number;
  lon: number;
  name: string;
};

export type WeatherDay = {
  date: string;
  kind: WeatherKind;
  label: string;
  tempMax: number;
  tempMin: number;
  precipitationMm: number;
};

export type WeatherSnapshot = {
  locationName: string;
  currentTemp: number;
  feelsLike: number;
  windMs: number;
  precipitationMm: number;
  kind: WeatherKind;
  label: string;
  days: WeatherDay[];
};

type ForecastResponse = {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
};

type ReverseResponse = {
  results?: { name?: string; admin1?: string }[];
};

function weatherFromCode(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: "clear", label: "Clear" };
  if (code === 1) return { kind: "partly", label: "Mainly clear" };
  if (code === 2) return { kind: "partly", label: "Partly cloudy" };
  if (code === 3) return { kind: "overcast", label: "Overcast" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Fog" };
  if (code >= 51 && code <= 57) return { kind: "drizzle", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { kind: "rain", label: "Rain" };
  if (code >= 71 && code <= 77) return { kind: "snow", label: "Snow" };
  if (code >= 80 && code <= 82) return { kind: "rain", label: "Showers" };
  if (code === 85 || code === 86) return { kind: "snow", label: "Snow showers" };
  if (code >= 95) return { kind: "thunder", label: "Thunderstorm" };
  return { kind: "overcast", label: "Cloudy" };
}

export function loadSavedWeatherLocation(): WeatherLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WEATHER_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherLocation;
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lon !== "number" ||
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lon)
    ) {
      return null;
    }
    return {
      lat: parsed.lat,
      lon: parsed.lon,
      name: typeof parsed.name === "string" && parsed.name ? parsed.name : "Local",
    };
  } catch {
    return null;
  }
}

export function saveWeatherLocation(location: WeatherLocation) {
  localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(location));
}

export function clearWeatherLocation() {
  localStorage.removeItem(WEATHER_LOCATION_KEY);
}

/** Open-Meteo has no reverse geocoding; try their reverse URL, then fall back. */
export async function lookupPlaceName(
  lat: number,
  lon: number
): Promise<string> {
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = (await res.json()) as ReverseResponse;
      const name = data.results?.[0]?.name?.trim();
      if (name) return name;
    }
  } catch {
    // Open-Meteo reverse is not a public product; ignore.
  }
  return "Local";
}

export async function getWeatherSnapshot(
  location: WeatherLocation
): Promise<WeatherSnapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.lat));
  url.searchParams.set("longitude", String(location.lon));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation"
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum"
  );
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Could not load weather.");

  const data = (await res.json()) as ForecastResponse;
  const current = data.current;
  const daily = data.daily;
  if (!current || !daily?.time?.length) {
    throw new Error("Could not load weather.");
  }

  const now = weatherFromCode(current.weather_code);
  const days: WeatherDay[] = daily.time.map((date, i) => {
    const parsed = weatherFromCode(daily.weather_code[i] ?? 3);
    return {
      date,
      kind: parsed.kind,
      label: parsed.label,
      tempMax: Math.round(daily.temperature_2m_max[i] ?? 0),
      tempMin: Math.round(daily.temperature_2m_min[i] ?? 0),
      precipitationMm: daily.precipitation_sum[i] ?? 0,
    };
  });

  return {
    locationName: location.name,
    currentTemp: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    windMs: current.wind_speed_10m,
    precipitationMm: current.precipitation,
    kind: now.kind,
    label: now.label,
    days,
  };
}
