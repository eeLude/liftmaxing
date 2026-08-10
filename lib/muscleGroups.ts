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
