import { isCardioMuscle } from "@/lib/utils";

export const DASHBOARD_MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Legs",
  "Shoulders & Arms",
] as const;

export type DashboardMuscleGroup = (typeof DASHBOARD_MUSCLE_GROUPS)[number];

export function getDashboardMuscleGroup(
  targetMuscle: string
): DashboardMuscleGroup | null {
  if (isCardioMuscle(targetMuscle)) return null;
  switch (targetMuscle) {
    case "Chest":
      return "Chest";
    case "Back":
    case "Rear Delts":
      return "Back";
    case "Quads":
    case "Hamstrings":
    case "Calves":
    case "Core":
      return "Legs";
    case "Shoulders":
    case "Biceps":
    case "Triceps":
      return "Shoulders & Arms";
    default:
      return null;
  }
}

export function emptyMuscleGroupProgress(): Record<
  DashboardMuscleGroup,
  never[]
> {
  return {
    Chest: [],
    Back: [],
    Legs: [],
    "Shoulders & Arms": [],
  };
}

/** Primary lifting muscles for weekly set-volume (hypertrophy tracking). */
export const VOLUME_MUSCLES = [
  "Chest",
  "Back",
  "Shoulders",
  "Rear Delts",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Calves",
  "Core",
] as const;

export type VolumeMuscle = (typeof VOLUME_MUSCLES)[number];

export const VOLUME_SET_MIN = 10;
export const VOLUME_SET_MAX = 20;

export type VolumeSetStatus = "under" | "in_range" | "high";

export function getVolumeSetStatus(sets: number): VolumeSetStatus {
  if (sets < VOLUME_SET_MIN) return "under";
  if (sets > VOLUME_SET_MAX) return "high";
  return "in_range";
}

export const VOLUME_SET_STATUS_COLOR: Record<VolumeSetStatus, string> = {
  under: "#71717a",
  in_range: "#22c55e",
  high: "#f59e0b",
};
