import { toDateString } from "@/lib/utils";

export type FlagDayKind = "official" | "established";

export type FlagDay = {
  date: string;
  name: string;
  kind: FlagDayKind;
};

function iso(year: number, month: number, day: number): string {
  return toDateString(new Date(year, month - 1, day, 12, 0, 0));
}

/** weekday: 0 = Sunday … 6 = Saturday */
function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  n: number
): string {
  const first = new Date(year, month - 1, 1, 12, 0, 0);
  const offset = (weekday - first.getDay() + 7) % 7;
  return toDateString(
    new Date(year, month - 1, 1 + offset + (n - 1) * 7, 12, 0, 0)
  );
}

function lastWeekday(year: number, month: number, weekday: number): string {
  const last = new Date(year, month, 0, 12, 0, 0);
  const diff = (last.getDay() - weekday + 7) % 7;
  last.setDate(last.getDate() - diff);
  return toDateString(last);
}

/** Saturday between 20 and 26 June (juhannuspäivä). */
function midsummerSaturday(year: number): string {
  const day = new Date(year, 5, 20, 12, 0, 0);
  while (day.getDay() !== 6) day.setDate(day.getDate() + 1);
  return toDateString(day);
}

/** Official + established Finnish flag days (intermin.fi). Not recommended-only days. */
export function flagDaysForYear(year: number): FlagDay[] {
  const days: FlagDay[] = [
    { date: iso(year, 2, 5), name: "J. L. Runebergin päivä", kind: "established" },
    { date: iso(year, 2, 28), name: "Kalevalan päivä", kind: "official" },
    { date: iso(year, 3, 19), name: "Minna Canthin päivä", kind: "established" },
    { date: iso(year, 4, 9), name: "Mikael Agricolan päivä", kind: "established" },
    { date: iso(year, 4, 27), name: "Kansallinen veteraanipäivä", kind: "established" },
    { date: iso(year, 5, 1), name: "Vappu", kind: "official" },
    { date: iso(year, 5, 9), name: "Eurooppa-päivä", kind: "established" },
    { date: nthWeekday(year, 5, 0, 2), name: "Äitienpäivä", kind: "official" },
    { date: iso(year, 5, 12), name: "J. V. Snellmanin päivä", kind: "established" },
    {
      date: nthWeekday(year, 5, 0, 3),
      name: "Kaatuneitten muistopäivä",
      kind: "established",
    },
    {
      date: iso(year, 6, 4),
      name: "Puolustusvoimain lippujuhlan päivä",
      kind: "official",
    },
    { date: midsummerSaturday(year), name: "Juhannus", kind: "official" },
    { date: iso(year, 7, 6), name: "Eino Leinon päivä", kind: "established" },
    {
      date: lastWeekday(year, 8, 6),
      name: "Suomen luonnon päivä",
      kind: "established",
    },
    { date: iso(year, 10, 1), name: "Miina Sillanpään päivä", kind: "established" },
    { date: iso(year, 10, 10), name: "Aleksis Kiven päivä", kind: "established" },
    { date: iso(year, 10, 24), name: "YK:n päivä", kind: "established" },
    { date: iso(year, 11, 6), name: "Ruotsalaisuuden päivä", kind: "established" },
    { date: nthWeekday(year, 11, 0, 2), name: "Isänpäivä", kind: "official" },
    { date: iso(year, 11, 20), name: "Lapsen oikeuksien päivä", kind: "established" },
    { date: iso(year, 12, 6), name: "Itsenäisyyspäivä", kind: "official" },
    { date: iso(year, 12, 8), name: "Jean Sibeliuksen päivä", kind: "established" },
  ];

  days.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  const merged: FlagDay[] = [];
  for (const day of days) {
    const prev = merged[merged.length - 1];
    if (prev && prev.date === day.date) {
      prev.name = `${prev.name} · ${day.name}`;
      if (day.kind === "official") prev.kind = "official";
    } else {
      merged.push({ ...day });
    }
  }
  return merged;
}

export type FlagGlance = {
  today: FlagDay | null;
  next: FlagDay;
  daysUntilNext: number;
};

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T12:00:00`);
  const to = new Date(`${toIso}T12:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function flagGlance(todayIso: string): FlagGlance {
  const year = Number(todayIso.slice(0, 4));
  const upcoming = [...flagDaysForYear(year), ...flagDaysForYear(year + 1)].filter(
    (day) => day.date >= todayIso
  );
  const today = upcoming.find((day) => day.date === todayIso) ?? null;
  const later = upcoming.filter((day) => day.date > todayIso);
  const next = later[0] ?? flagDaysForYear(year + 1)[0];

  return {
    today,
    next,
    daysUntilNext: daysBetween(todayIso, next.date),
  };
}
