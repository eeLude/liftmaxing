export const SPOT_REFETCH_MS = 60_000;

/** Absolute snt/kWh (VAT included). Color is not relative to today's min/max. */
export const SPOT_CHEAP_MAX_C = 10;
export const SPOT_DEAR_MIN_C = 20;

export type SpotSlot = {
  start: string;
  priceC: number;
  rank: number | null;
};

export type SpotSnapshot = {
  slots: SpotSlot[];
};

type ApiSlot = {
  DateTime?: string;
  PriceWithTax?: number | null;
  Rank?: number | null;
};

function euroToSnt(eurPerKwh: number): number {
  return eurPerKwh * 100;
}

export function mapSpotSlots(raw: ApiSlot[]): SpotSlot[] {
  return raw
    .filter((row) => row.DateTime != null && row.PriceWithTax != null)
    .map((row) => ({
      start: row.DateTime!,
      priceC: euroToSnt(row.PriceWithTax as number),
      rank: row.Rank ?? null,
    }))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function slotStartMs(slot: SpotSlot): number {
  return new Date(slot.start).getTime();
}

export function slotDurationMs(slots: SpotSlot[], index: number): number {
  const current = slots[index];
  const next = slots[index + 1];
  if (current && next) return slotStartMs(next) - slotStartMs(current);
  const prev = slots[index - 1];
  if (current && prev) return slotStartMs(current) - slotStartMs(prev);
  return 15 * 60 * 1000;
}

export function currentSlotIndex(slots: SpotSlot[], nowMs: number): number {
  let index = -1;
  for (let i = 0; i < slots.length; i++) {
    if (slotStartMs(slots[i]) <= nowMs) index = i;
    else break;
  }
  return index;
}

export function priceTone(priceC: number): "cheap" | "mid" | "dear" {
  if (priceC <= SPOT_CHEAP_MAX_C) return "cheap";
  if (priceC < SPOT_DEAR_MIN_C) return "mid";
  return "dear";
}

export function formatClock(isoOrMs: string | number): string {
  const date = typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
  return date.toLocaleTimeString("fi-FI", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
