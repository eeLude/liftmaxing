"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { HubCard } from "@/components/hub/HubCard";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import {
  SPOT_REFETCH_MS,
  currentSlotIndex,
  formatClock,
  priceTone,
  slotDurationMs,
  slotStartMs,
  type SpotSnapshot,
} from "@/lib/electricity";
import { formatLocaleNumber } from "@/lib/utils";

async function fetchSpotPrices(): Promise<SpotSnapshot> {
  const res = await fetch("/api/electricity");
  if (!res.ok) {
    throw new Error("Could not load electricity prices.");
  }
  return (await res.json()) as SpotSnapshot;
}

export function HubElectricityCard() {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const query = useQuery({
    queryKey: ["electricity-fi"],
    queryFn: fetchSpotPrices,
    staleTime: SPOT_REFETCH_MS,
    refetchInterval: SPOT_REFETCH_MS,
  });

  const slots = query.data?.slots ?? [];
  const index = currentSlotIndex(slots, nowMs);
  const current = index >= 0 ? slots[index] : null;
  const next = index >= 0 ? slots[index + 1] ?? null : null;

  const todaySlots = useMemo(() => {
    if (!current) return slots;
    const day = current.start.slice(0, 10);
    return slots.filter((slot) => slot.start.startsWith(day));
  }, [slots, current]);

  const minC = todaySlots.length
    ? Math.min(...todaySlots.map((s) => s.priceC))
    : 0;
  const maxC = todaySlots.length
    ? Math.max(...todaySlots.map((s) => s.priceC))
    : 1;
  const tone = current ? priceTone(current.priceC, minC, maxC) : "mid";
  const endsAt =
    current && index >= 0
      ? slotStartMs(current) + slotDurationMs(slots, index)
      : null;

  return (
    <HubCard
      title="Electricity"
      footer={
        <p className="text-center text-[10px] text-zinc-600">
          FI spot ·{" "}
          <a
            href="https://spot-hinta.fi/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-zinc-700 underline-offset-2 hover:text-zinc-400"
          >
            spot-hinta.fi
          </a>
        </p>
      }
    >
      {query.isError && (
        <QueryErrorBanner
          message="Could not load electricity prices."
          onRetry={() => void query.refetch()}
        />
      )}

      {query.isLoading && !current && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}

      {current && (
        <>
          <p
            className={`text-3xl font-semibold tracking-tight ${
              tone === "cheap"
                ? "text-emerald-400"
                : tone === "dear"
                  ? "text-red-400"
                  : "text-amber-400"
            }`}
          >
            {formatLocaleNumber(current.priceC, 2)}
            <span className="ml-1 text-base font-medium text-zinc-500">
              snt/kWh
            </span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            until {formatClock(endsAt!)}
            {next && (
              <>
                {" · next "}
                {formatLocaleNumber(next.priceC, 2)}
              </>
            )}
          </p>
          {current.rank != null && todaySlots.length > 0 && (
            <p className="text-xs text-zinc-600">
              {current.rank}/{todaySlots.length} today · cheapest{" "}
              {formatLocaleNumber(minC, 2)}
            </p>
          )}
          <div className="mt-4 flex h-10 items-end">
            {todaySlots.map((slot) => {
              const t = priceTone(slot.priceC, minC, maxC);
              const px =
                maxC <= minC
                  ? 20
                  : 8 + ((slot.priceC - minC) / (maxC - minC)) * 32;
              const isNow = slot.start === current.start;
              return (
                <div
                  key={slot.start}
                  title={`${formatClock(slot.start)} · ${formatLocaleNumber(slot.priceC, 2)} snt`}
                  className={`min-w-px flex-1 ${
                    isNow
                      ? "bg-zinc-100"
                      : t === "cheap"
                        ? "bg-emerald-500"
                        : t === "dear"
                          ? "bg-red-500"
                          : "bg-amber-400"
                  }`}
                  style={{ height: px }}
                />
              );
            })}
          </div>
        </>
      )}
    </HubCard>
  );
}
