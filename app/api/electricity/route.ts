import { NextResponse } from "next/server";
import { mapSpotSlots } from "@/lib/electricity";

const UPSTREAM =
  "https://api.spot-hinta.fi/TodayAndDayForward?region=FI&priceResolution=15";

export async function GET() {
  const res = await fetch(UPSTREAM, {
    next: { revalidate: 55 },
    signal: AbortSignal.timeout(8_000),
  });
  if (res.status === 429) {
    return NextResponse.json(
      { error: "Spot price API rate limited. Try again in a minute." },
      { status: 429 }
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: "Could not load spot prices." },
      { status: 502 }
    );
  }

  const raw = (await res.json()) as unknown;
  if (!Array.isArray(raw)) {
    return NextResponse.json(
      { error: "Could not load spot prices." },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { slots: mapSpotSlots(raw) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=55, stale-while-revalidate=120",
      },
    }
  );
}
