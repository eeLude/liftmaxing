import type { MoodLog } from "@/types/database";
import { formatLocaleNumber } from "@/lib/utils";

export const MOOD_SCORES = [1, 2, 3, 4, 5] as const;
export type MoodScore = (typeof MOOD_SCORES)[number];

export const MOOD_OPTIONS: {
  score: MoodScore;
  label: string;
  fill: string;
  selected: string;
}[] = [
  {
    score: 1,
    label: "Awful",
    fill: "bg-rose-950 text-rose-200",
    selected: "ring-2 ring-rose-300",
  },
  {
    score: 2,
    label: "Low",
    fill: "bg-orange-950 text-orange-200",
    selected: "ring-2 ring-orange-300",
  },
  {
    score: 3,
    label: "Okay",
    fill: "bg-zinc-700 text-zinc-200",
    selected: "ring-2 ring-zinc-300",
  },
  {
    score: 4,
    label: "Good",
    fill: "bg-emerald-900 text-emerald-100",
    selected: "ring-2 ring-emerald-300",
  },
  {
    score: 5,
    label: "Great",
    fill: "bg-brand text-white",
    selected: "ring-2 ring-sky-200",
  },
];

const FILL_BY_SCORE: Record<MoodScore, string> = {
  1: "bg-rose-950",
  2: "bg-orange-950",
  3: "bg-zinc-700",
  4: "bg-emerald-800",
  5: "bg-brand",
};

export function moodFill(score: number | null | undefined): string {
  if (score == null || score < 1 || score > 5) return "bg-zinc-800";
  return FILL_BY_SCORE[score as MoodScore];
}

export function moodLabel(score: number | null | undefined): string {
  if (score == null) return "";
  return MOOD_OPTIONS.find((o) => o.score === score)?.label ?? "";
}

export function averageMood(logs: MoodLog[]): number | null {
  if (logs.length === 0) return null;
  const sum = logs.reduce((acc, l) => acc + l.score, 0);
  return Math.round((sum / logs.length) * 10) / 10;
}

export function formatMoodAverage(value: number | null): string | null {
  if (value == null) return null;
  return formatLocaleNumber(value, 1);
}

/** Consecutive logged days ending today or yesterday. */
export function moodStreak(logs: MoodLog[], todayIso: string): number {
  const dates = new Set(logs.map((l) => l.date));
  const cursor = new Date(`${todayIso}T12:00:00`);
  if (!dates.has(todayIso)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (dates.has(isoFromLocalDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function isoFromLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function lastNDays(todayIso: string, n: number): string[] {
  const out: string[] = [];
  const cursor = new Date(`${todayIso}T12:00:00`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    out.push(isoFromLocalDate(d));
  }
  return out;
}

export function logsInRange(
  logs: MoodLog[],
  startIso: string,
  endIso: string
): MoodLog[] {
  return logs.filter((l) => l.date >= startIso && l.date <= endIso);
}
