"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/MobileLayout";
import { MuscleGroupCards } from "@/components/MuscleGroupCards";
import { WorkoutContributionGraph } from "@/components/WorkoutContributionGraph";
import { WorkoutCalendar } from "@/components/WorkoutCalendar";
import {
  ChartSkeleton,
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import { BodyWeightChart } from "@/components/charts/BodyWeightChart";
import { ProgressiveOverloadChart } from "@/components/charts/ProgressiveOverloadChart";
import { HealthTrendChart } from "@/components/charts/HealthTrendChart";
import { MuscleVolumeChart } from "@/components/charts/MuscleVolumeChart";
import { WeeklyTrainingVolumeChart } from "@/components/charts/WeeklyTrainingVolumeChart";
import type { WorkoutDay } from "@/lib/queries";
import {
  getHealthLogs,
  getMovementsWithHistory,
  getMuscleGroupProgress,
  getUserProfile,
  getWeeklyMuscleVolume,
  getWeeklyTrainingVolume,
} from "@/lib/queries";

export default function DashboardPage() {
  const router = useRouter();
  const movementsQuery = useQuery({
    queryKey: ["movements-with-history"],
    queryFn: getMovementsWithHistory,
  });

  const healthQuery = useQuery({
    queryKey: ["health-logs"],
    queryFn: () => getHealthLogs(120),
  });

  const volumeQuery = useQuery({
    queryKey: ["weekly-volume"],
    queryFn: getWeeklyMuscleVolume,
  });

  const trainingVolumeQuery = useQuery({
    queryKey: ["weekly-training-volume"],
    queryFn: () => getWeeklyTrainingVolume(12),
  });

  const muscleGroupQuery = useQuery({
    queryKey: ["muscle-group-progress"],
    queryFn: getMuscleGroupProgress,
  });

  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: getUserProfile,
  });

  const dashboardQueries = [
    movementsQuery,
    healthQuery,
    volumeQuery,
    trainingVolumeQuery,
    muscleGroupQuery,
    profileQuery,
  ];

  const isInitialLoading = dashboardQueries.some((q) => q.isLoading);
  const failedQueries = dashboardQueries.filter((q) => q.isError);

  const retryAll = () => {
    for (const q of failedQueries) {
      void q.refetch();
    }
  };

  const hasCalories = (healthQuery.data ?? []).some((l) => l.calories != null);

  const handleDayAction = (date: string, workout: WorkoutDay | null) => {
    if (workout) {
      router.push(`/workout/${workout.splitId}?date=${date}`);
    } else {
      router.push(`/workout?date=${date}`);
    }
  };

  return (
    <MobileLayout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Liftmaxxing</h1>
        <p className="text-sm text-zinc-400">Track strength, volume & bodyweight</p>
      </header>

      {failedQueries.length > 0 && (
        <QueryErrorBanner
          message={`Could not load ${failedQueries.length} dashboard section${failedQueries.length > 1 ? "s" : ""}.`}
          onRetry={retryAll}
        />
      )}

      {isInitialLoading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading dashboard…
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Training Activity
        </h2>
        <WorkoutContributionGraph />
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Workout Calendar
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Tap a day to log or edit that workout
        </p>
        <WorkoutCalendar onDayAction={handleDayAction} />
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Body Weight
        </h2>
        {healthQuery.isLoading ? (
          <ChartSkeleton />
        ) : (
          <BodyWeightChart
            logs={healthQuery.data ?? []}
            goalType={profileQuery.data?.goal_type ?? null}
          />
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Strength Progress
        </h2>
        {movementsQuery.isLoading ? (
          <ChartSkeleton />
        ) : (
          <ProgressiveOverloadChart movements={movementsQuery.data ?? []} />
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Muscle Group Progress
        </h2>
        <MuscleGroupCards
          data={muscleGroupQuery.data}
          isLoading={muscleGroupQuery.isLoading}
        />
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Weekly Training Sets
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Lifting sets per Monday–Sunday week
        </p>
        {trainingVolumeQuery.isLoading ? (
          <ChartSkeleton />
        ) : (
          <WeeklyTrainingVolumeChart data={trainingVolumeQuery.data ?? []} />
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          This Week&apos;s Sets by Muscle
        </h2>
        {volumeQuery.isLoading ? (
          <ChartSkeleton />
        ) : (
          <MuscleVolumeChart data={volumeQuery.data ?? []} />
        )}
      </section>

      {hasCalories && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Health & Calories
          </h2>
          {healthQuery.isLoading ? (
            <ChartSkeleton />
          ) : (
            <HealthTrendChart logs={healthQuery.data ?? []} />
          )}
        </section>
      )}
    </MobileLayout>
  );
}
