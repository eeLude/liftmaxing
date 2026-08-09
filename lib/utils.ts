/** Epley formula: estimated 1RM */
export function calculateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function formatSetLine(weightKg: number, reps: number): string {
  return `${weightKg} kg x ${reps} reps`;
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
