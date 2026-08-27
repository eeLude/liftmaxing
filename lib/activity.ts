export const RUN_SPLIT_NAME = "Run";

export function isRunSplitName(name: string): boolean {
  return name === RUN_SPLIT_NAME;
}

export type ActivityKind = "lift" | "run" | "both";

export function workoutActivityKind(day: {
  hasRun: boolean;
  hasLift: boolean;
}): ActivityKind {
  if (day.hasRun && day.hasLift) return "both";
  if (day.hasRun) return "run";
  return "lift";
}

/** Hex fills for the SVG contribution graph (dark theme). */
export const ACTIVITY_FILL = {
  empty: "#27272a",
  lift: "#004cff",
  liftProgress: "#004cff80",
  run: "#f59e0b",
  runProgress: "#f59e0b80",
} as const;

export function activityCellClass(day: {
  hasRun: boolean;
  hasLift: boolean;
  isComplete: boolean;
}): string {
  const kind = workoutActivityKind(day);
  if (kind === "both") {
    return day.isComplete
      ? "bg-gradient-to-r from-brand to-amber-500"
      : "bg-gradient-to-r from-brand/40 to-amber-500/40";
  }
  if (kind === "run") {
    return day.isComplete ? "bg-amber-500" : "bg-amber-500/40";
  }
  return day.isComplete ? "bg-brand" : "bg-brand/40";
}

export function activityDayLabel(day: {
  hasRun: boolean;
  hasLift: boolean;
  isComplete: boolean;
}): string {
  const kind = workoutActivityKind(day);
  const what =
    kind === "both" ? "gym + run" : kind === "run" ? "run" : "workout";
  return day.isComplete ? ` — ${what}` : ` — ${what} in progress`;
}
