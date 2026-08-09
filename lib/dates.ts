import { format, parseISO } from "date-fns";
import { fi } from "date-fns/locale";
import { toDateString } from "@/lib/utils";

export { toDateString };

/** Finnish date format: 7.8.2026 */
export function formatFiDate(iso: string | Date): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "d.M.yyyy", { locale: fi });
}

/** Finnish month + year for calendar header: elokuu 2026 */
export function formatFiMonthYear(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return format(d, "LLLL yyyy", { locale: fi });
}

/** Short weekday labels Mon–Sun in Finnish */
export const FI_WEEKDAYS = ["ma", "ti", "ke", "to", "pe", "la", "su"];

/** GitHub-style contribution chart: Mon, Wed, Fri (Sun-start grid rows 1, 3, 5) */
export const CONTRIBUTION_DAY_LABELS = ["Ma", "Ke", "Pe"] as const;
export const CONTRIBUTION_DAY_LABEL_ROWS = [1, 3, 5] as const;

export const FI_MONTHS_SHORT = [
  "Tammi",
  "Helmi",
  "Maalis",
  "Huhti",
  "Touko",
  "Kesä",
  "Heinä",
  "Elo",
  "Syys",
  "Loka",
  "Marras",
  "Joulu",
] as const;

export function getContributionMonthLabels(
  weeks: (string | null)[][]
): (string | null)[] {
  let lastKey: string | null = null;
  return weeks.map((week) => {
    const days = week.filter((d): d is string => d != null);
    if (days.length === 0) return null;

    // Label the week column that contains the 1st (GitHub-style alignment).
    for (const iso of days) {
      const d = parseISO(`${iso}T12:00:00`);
      if (d.getDate() === 1) {
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key !== lastKey) {
          lastKey = key;
          return FI_MONTHS_SHORT[d.getMonth()];
        }
        return null;
      }
    }

    // Chart edge: first visible week of a month when the 1st is off-screen.
    const first = parseISO(`${days[0]}T12:00:00`);
    const key = `${first.getFullYear()}-${first.getMonth()}`;
    if (key !== lastKey) {
      lastKey = key;
      return FI_MONTHS_SHORT[first.getMonth()];
    }
    return null;
  });
}

export function isFutureDate(iso: string): boolean {
  return iso > toDateString(new Date());
}

/** Sunday-based weeks (GitHub layout); null = future day in current week */
export function getContributionWeeks(weekCount: number): (string | null)[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toDateString(today);

  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - today.getDay());

  const weeks: (string | null)[][] = [];
  for (let w = weekCount - 1; w >= 0; w--) {
    const week: (string | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(currentSunday);
      cell.setDate(currentSunday.getDate() - w * 7 + d);
      const iso = toDateString(cell);
      week.push(iso > todayIso ? null : iso);
    }
    weeks.push(week);
  }
  return weeks;
}

export function getContributionDateRange(weekCount: number): {
  start: string;
  end: string;
} {
  const weeks = getContributionWeeks(weekCount);
  const dates = weeks.flat().filter((d): d is string => d != null);
  return {
    start: dates[0] ?? toDateString(new Date()),
    end: dates[dates.length - 1] ?? toDateString(new Date()),
  };
}
