import { parseISO, subDays } from "date-fns";

/** Epley formula: estimated 1RM (reps capped at 12 — unreliable above that) */
export function calculateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  const effectiveReps = Math.min(reps, 12);
  return Math.round(weightKg * (1 + effectiveReps / 30) * 10) / 10;
}

/** Change from latest weight vs the most recent log on or before 7 days prior. */
export function getWeeklyWeightChange(
  logs: { date: string; weight: number }[]
): number | null {
  if (logs.length < 2) return null;
  const latest = logs.at(-1)!;
  const weekAgoIso = toDateString(subDays(parseISO(`${latest.date}T12:00:00`), 7));
  const prior = [...logs].reverse().find((l) => l.date <= weekAgoIso);
  if (!prior || prior.date === latest.date) return null;
  return Math.round((latest.weight - prior.weight) * 10) / 10;
}

export function formatSetLine(weightKg: number, reps: number): string {
  return `${weightKg} kg x ${reps} reps`;
}

export type SetPerformance = { weight_kg: number; reps: number };

export type ProgressChange = {
  label: string;
  direction: "up" | "down" | "neutral";
};

/** Best set in a session: heaviest weight, then most reps. */
export function pickBestSet(sets: SetPerformance[]): SetPerformance | null {
  if (sets.length === 0) return null;
  return sets.reduce((best, set) => {
    if (set.weight_kg > best.weight_kg) return set;
    if (set.weight_kg === best.weight_kg && set.reps > best.reps) return set;
    return best;
  });
}

/** Session-over-session change for dashboard muscle cards. */
export function formatProgressChange(
  latest: SetPerformance,
  previous: SetPerformance
): ProgressChange | null {
  const weightDelta = Math.round((latest.weight_kg - previous.weight_kg) * 10) / 10;

  if (weightDelta > 0) {
    const pct =
      previous.weight_kg > 0
        ? Math.round((weightDelta / previous.weight_kg) * 1000) / 10
        : 0;
    return {
      label: `+${weightDelta} kg (+${pct}%)`,
      direction: "up",
    };
  }

  if (weightDelta < 0) {
    const drop = Math.abs(weightDelta);
    const pct =
      previous.weight_kg > 0
        ? Math.round((drop / previous.weight_kg) * 1000) / 10
        : 0;
    return {
      label: `-${drop} kg (-${pct}%)`,
      direction: "down",
    };
  }

  const repDelta = latest.reps - previous.reps;
  if (repDelta > 0) {
    return {
      label: `+${repDelta} rep${repDelta === 1 ? "" : "s"}`,
      direction: "up",
    };
  }
  if (repDelta < 0) {
    const drop = Math.abs(repDelta);
    return {
      label: `-${drop} rep${drop === 1 ? "" : "s"}`,
      direction: "down",
    };
  }

  return null;
}

export function isCardioMuscle(muscle: string): boolean {
  return muscle === "Cardio";
}

/** Run logs store duration in reps and distance (km) in weight_kg. */
export function formatCardioSetLine(distanceKm: number, durationMin: number): string {
  const parts = [`${durationMin} min`];
  if (distanceKm > 0) parts.push(`${distanceKm} km`);
  return parts.join(" · ");
}

export function formatPreviousSets(
  sets: { weight_kg: number; reps: number }[],
  targetMuscle?: string
): string {
  if (sets.length === 0) return "No previous data";
  if (targetMuscle && isCardioMuscle(targetMuscle)) {
    const s = sets[0];
    return formatCardioSetLine(Number(s.weight_kg), s.reps);
  }
  return sets.map((s) => formatSetLine(Number(s.weight_kg), s.reps)).join(", ");
}

/** Rolling 7-day average for weight trend */
export function rollingAverage(values: (number | null)[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    const nums = slice.filter((v): v is number => v != null);
    if (nums.length === 0) return null;
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
  });
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
