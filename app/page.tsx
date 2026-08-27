"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HubMonthActivity } from "@/components/HubMonthActivity";
import { MobileLayout } from "@/components/MobileLayout";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import { HubWeightChart } from "@/components/charts/HubWeightChart";
import { formatBookYearLine } from "@/lib/books";
import {
  getBookYearStats,
  getHealthLogs,
  getWorkoutDaysInRange,
} from "@/lib/queries";
import { toDateString } from "@/lib/utils";

export default function HubPage() {
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

  const booksQuery = useQuery({
    queryKey: ["book-year-stats"],
    queryFn: getBookYearStats,
  });

  const hubQueries = [workoutsQuery, healthQuery, booksQuery];
  const isInitialLoading = hubQueries.some((q) => q.isLoading);
  const failedQueries = hubQueries.filter((q) => q.isError);

  const retryAll = () => {
    for (const q of failedQueries) {
      void q.refetch();
    }
  };

  const yearDays = workoutsQuery.data ?? [];
  const sessionsThisYear = yearDays.filter((d) => d.isComplete).length;

  const bookStats = booksQuery.data;
  const reading = bookStats?.reading ?? [];

  return (
    <MobileLayout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Liftmaxxing</h1>
        <p className="text-sm text-zinc-400">Gym, health & reading</p>
      </header>

      {failedQueries.length > 0 && (
        <QueryErrorBanner
          message={`Could not load ${failedQueries.length} hub section${failedQueries.length > 1 ? "s" : ""}.`}
          onRetry={retryAll}
        />
      )}

      {isInitialLoading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}

      <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Gym
        </h2>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">
          {sessionsThisYear}
        </p>
        <p className="text-sm text-zinc-500">
          session{sessionsThisYear === 1 ? "" : "s"} this year
        </p>

        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Weight
          </h3>
          <HubWeightChart logs={healthQuery.data ?? []} />
        </div>

        <div className="mt-5">
          <HubMonthActivity days={yearDays} />
        </div>

        <div className="mt-5 flex gap-2">
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
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Books
        </h2>
        {bookStats ? (
          <p className="mt-2 text-lg font-semibold text-zinc-100">
            {formatBookYearLine(bookStats)}
            <span className="block text-sm font-normal text-zinc-500">
              in {bookStats.year}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">No reading data yet</p>
        )}
        {reading.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {reading.slice(0, 3).map((book) => (
              <li key={book.id} className="text-sm text-zinc-300">
                {book.title}
                {book.author ? (
                  <span className="text-zinc-500"> · {book.author}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Nothing in progress</p>
        )}
        <Link
          href="/books"
          className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
        >
          Open reading log
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </MobileLayout>
  );
}
