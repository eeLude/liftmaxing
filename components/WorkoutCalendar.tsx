"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingStates";
import { getWorkoutDaysInMonth, type WorkoutDay } from "@/lib/queries";
import {
  FI_WEEKDAYS,
  formatFiMonthYear,
  isFutureDate,
  toDateString,
} from "@/lib/dates";

export function WorkoutCalendar({
  onDayAction,
}: {
  onDayAction: (date: string, workout: WorkoutDay | null) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data: workoutDays, isLoading, isError, refetch } = useQuery({
    queryKey: ["workout-days", year, month],
    queryFn: () => getWorkoutDaysInMonth(year, month),
  });

  const daysByDate = useMemo(() => {
    const map = new Map<string, WorkoutDay>();
    for (const d of workoutDays ?? []) {
      map.set(d.date, d);
    }
    return map;
  }, [workoutDays]);

  const grid = useMemo(() => {
    const firstDow = new Date(year, month - 1, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner className="h-6 w-6" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-4 text-center text-sm text-red-300">
        <p>Could not load calendar.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 text-xs font-medium text-red-200 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-sm font-semibold capitalize text-zinc-200">
          {formatFiMonthYear(year, month)}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
        {FI_WEEKDAYS.map((d) => (
          <div key={d} className="py-1 font-medium uppercase">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const workout = daysByDate.get(iso);
          const isToday = iso === toDateString(today);
          const isFuture = isFutureDate(iso);

          return (
            <button
              key={iso}
              type="button"
              disabled={isFuture}
              onClick={() => onDayAction(iso, workout ?? null)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition ${
                isFuture
                  ? "cursor-not-allowed text-zinc-700"
                  : "cursor-pointer hover:bg-zinc-800"
              } ${isToday ? "font-bold text-brand" : "text-zinc-300"}`}
            >
              {day}
              {workout?.isComplete && (
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-brand" />
              )}
              {workout && !workout.isComplete && (
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-brand/50 ring-1 ring-brand/40" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
