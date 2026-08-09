"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { WorkoutCalendar } from "@/components/WorkoutCalendar";
import { BodyWeightChart } from "@/components/charts/BodyWeightChart";
import { ProgressiveOverloadChart } from "@/components/charts/ProgressiveOverloadChart";
import { HealthTrendChart } from "@/components/charts/HealthTrendChart";
import { MuscleVolumeChart } from "@/components/charts/MuscleVolumeChart";
import { WeeklyTrainingVolumeChart } from "@/components/charts/WeeklyTrainingVolumeChart";
import {
  getHealthLogs,
  getMovementsWithHistory,
  getWeeklyMuscleVolume,
  getWeeklyTrainingVolume,
} from "@/lib/queries";

export default function DashboardPage() {
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

  const hasCalories = (healthQuery.data ?? []).some((l) => l.calories != null);

  return (
    <MobileLayout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Liftmaxxing</h1>
        <p className="text-sm text-zinc-400">Track strength, volume & bodyweight</p>
      </header>

      <Link
        href="/workout"
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-lg font-semibold text-white shadow-lg shadow-brand/30 transition active:scale-[0.98]"
      >
        <Dumbbell className="h-6 w-6" />
        Start Today&apos;s Workout
      </Link>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Workout Calendar
        </h2>
        <WorkoutCalendar />
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Body Weight
        </h2>
        <BodyWeightChart logs={healthQuery.data ?? []} />
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Strength Progress
        </h2>
        <ProgressiveOverloadChart movements={movementsQuery.data ?? []} />
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Weekly Training Volume
        </h2>
        <WeeklyTrainingVolumeChart data={trainingVolumeQuery.data ?? []} />
      </section>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          This Week by Muscle Group
        </h2>
        <MuscleVolumeChart data={volumeQuery.data ?? []} />
      </section>

      {hasCalories && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Health & Calories
          </h2>
          <HealthTrendChart logs={healthQuery.data ?? []} />
        </section>
      )}
    </MobileLayout>
  );
}
