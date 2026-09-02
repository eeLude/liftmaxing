import type { MoodLog } from "@/types/database";
import { translate, type Locale, type MessageKey } from "@/lib/i18n/messages";
import { formatLocaleNumber } from "@/lib/utils";

export const MOOD_SCORES = [1, 2, 3, 4, 5] as const;
export type MoodScore = (typeof MOOD_SCORES)[number];

export const MOOD_OPTIONS: {
  score: MoodScore;
  label: string;
  fill: string;
  hover: string;
}[] = [
  {
    score: 1,
    label: "Awful",
    fill: "bg-rose-500 text-white",
    hover: "hover:bg-rose-500 hover:text-white",
  },
  {
    score: 2,
    label: "Low",
    fill: "bg-orange-500 text-white",
    hover: "hover:bg-orange-500 hover:text-white",
  },
  {
    score: 3,
    label: "Okay",
    fill: "bg-amber-400 text-zinc-950",
    hover: "hover:bg-amber-400 hover:text-zinc-950",
  },
  {
    score: 4,
    label: "Good",
    fill: "bg-lime-500 text-zinc-950",
    hover: "hover:bg-lime-500 hover:text-zinc-950",
  },
  {
    score: 5,
    label: "Great",
    fill: "bg-emerald-400 text-zinc-950",
    hover: "hover:bg-emerald-400 hover:text-zinc-950",
  },
];

const FILL_BY_SCORE: Record<MoodScore, string> = {
  1: "bg-rose-500",
  2: "bg-orange-500",
  3: "bg-amber-400",
  4: "bg-lime-500",
  5: "bg-emerald-400",
};

export function moodFill(score: number | null | undefined): string {
  if (score == null || score < 1 || score > 5) return "bg-zinc-800";
  return FILL_BY_SCORE[score as MoodScore];
}

export function moodLabel(
  score: number | null | undefined,
  locale: Locale = "en"
): string {
  if (score == null || score < 1 || score > 5) return "";
  return translate(locale, `mood.${score}` as MessageKey);
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
