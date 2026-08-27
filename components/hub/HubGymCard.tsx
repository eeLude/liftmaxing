"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HubMonthActivity } from "@/components/HubMonthActivity";
import { HubCard } from "@/components/hub/HubCard";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import { HubWeightChart } from "@/components/charts/HubWeightChart";
import { getHealthLogs, getWorkoutDaysInRange } from "@/lib/queries";
import { toDateString } from "@/lib/utils";

export function HubGymCard() {
  const now = new Date();
  const today = toDateString(now);
  const yearStart = `${now.getFullYear()}-01-01`;

  const workoutsQuery = useQuery({
    queryKey: ["workout-days-range", yearStart, today],
    queryFn: () => getWorkoutDaysInRange(yearStart, today),
  });

  const healthQuery = useQuery({
    queryKey: ["health-logs"],
    queryFn: () => getHealthLogs(120),
  });

  const yearDays = workoutsQuery.data ?? [];
  const sessionsThisYear = yearDays.filter((d) => d.isComplete).length;
  const isLoading = workoutsQuery.isLoading || healthQuery.isLoading;
  const isError = workoutsQuery.isError || healthQuery.isError;
  const hasWeight = (healthQuery.data ?? []).some((l) => l.weight_kg != null);

  return (
    <HubCard
      title="Gym"
      footer={
        <div className="flex gap-2">
          <Link
            href="/gym"
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
          >
            Gym stats
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/workout"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand py-2.5 text-sm font-semibold text-white"
          >
            Log workout
          </Link>
        </div>
      }
    >
      {isError && (
        <QueryErrorBanner
          message="Could not load gym."
          onRetry={() => {
            void workoutsQuery.refetch();
            void healthQuery.refetch();
          }}
        />
      )}
      {isLoading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}
      {!isLoading && (
        <>
          <p className="text-3xl font-semibold tracking-tight text-zinc-100">
            {sessionsThisYear}
          </p>
          <p className="text-sm text-zinc-500">
            session{sessionsThisYear === 1 ? "" : "s"} this year
          </p>
        </>
      )}
      {hasWeight && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Weight
          </h3>
          <HubWeightChart logs={healthQuery.data ?? []} />
        </div>
      )}
      {!workoutsQuery.isLoading && (
        <div className="mt-5">
          <HubMonthActivity days={yearDays} />
        </div>
      )}
    </HubCard>
  );
}
