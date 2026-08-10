"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingStates";
import { MobileLayout } from "@/components/MobileLayout";
import { formatFiDate, isFutureDate, toDateString } from "@/lib/dates";
import { getSplits, getWorkoutSessionForDate } from "@/lib/queries";

function WorkoutPickerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const date =
    dateParam && !isFutureDate(dateParam) ? dateParam : toDateString(new Date());

  const sessionQuery = useQuery({
    queryKey: ["workout-session-for-date", date],
    queryFn: () => getWorkoutSessionForDate(date),
  });

  const splitsQuery = useQuery({
    queryKey: ["splits"],
    queryFn: getSplits,
  });

  useEffect(() => {
    if (!sessionQuery.data) return;
    router.replace(`/workout/${sessionQuery.data.split_id}?date=${date}`);
  }, [sessionQuery.data, date, router]);

  if (sessionQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner className="h-6 w-6" />
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <p className="text-center text-sm text-red-400">
        Could not load workout for this date. Check your connection and try again.
      </p>
    );
  }

  if (sessionQuery.data) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-zinc-500">
        <LoadingSpinner className="h-5 w-5" />
        Opening workout...
      </div>
    );
  }

  return (
    <>
      {splitsQuery.isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner className="h-6 w-6" />
        </div>
      )}

      {splitsQuery.isError && (
        <p className="text-center text-sm text-red-400">
          Could not load splits. Sign in and check your connection.
        </p>
      )}

      <div className="space-y-3">
        {splitsQuery.data?.map((split) => (
          <Link
            key={split.id}
            href={`/workout/${split.id}?date=${date}`}
            className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition active:scale-[0.99]"
          >
            <span className="text-lg font-semibold text-zinc-100">
              {split.name}
            </span>
            <ChevronRight className="h-5 w-5 text-brand" />
          </Link>
        ))}
      </div>
    </>
  );
}

function WorkoutPickerPage() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const date =
    dateParam && !isFutureDate(dateParam) ? dateParam : toDateString(new Date());

  return (
    <MobileLayout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Log Workout</h1>
        <p className="text-sm text-zinc-400">
          Choose split for {formatFiDate(date)}
        </p>
      </header>

      <WorkoutPickerContent />
    </MobileLayout>
  );
}

export default function WorkoutSelectorPage() {
  return (
    <Suspense
      fallback={
        <MobileLayout>
          <div className="flex justify-center py-8">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        </MobileLayout>
      }
    >
      <WorkoutPickerPage />
    </Suspense>
  );
}
