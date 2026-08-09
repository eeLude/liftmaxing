"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getWorkoutDaysInMonth,
  getWorkoutSessionSummary,
} from "@/lib/queries";
import { FI_WEEKDAYS, formatFiDate, formatFiMonthYear } from "@/lib/dates";

function DaySummary({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["session-summary", sessionId],
    queryFn: () => getWorkoutSessionSummary(sessionId),
  });

  if (isLoading) {
    return <p className="mt-3 text-sm text-zinc-500">Loading...</p>;
  }
  if (!data) return null;

  return (
    <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
      <p className="text-sm font-semibold text-zinc-100">
        {data.splitName} · {formatFiDate(data.date)}
      </p>
      <ul className="mt-3 space-y-2">
        {data.exercises.map((ex, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium text-zinc-300">{ex.name}</span>
            {ex.setsSummary && (
              <span className="ml-1 text-zinc-500">{ex.setsSummary}</span>
            )}
            {ex.note && (
              <p className="text-xs italic text-zinc-600">&ldquo;{ex.note}&rdquo;</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WorkoutCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );

  const { data: workoutDays } = useQuery({
    queryKey: ["workout-days", year, month],
    queryFn: () => getWorkoutDaysInMonth(year, month),
  });

  const daysByDate = useMemo(() => {
    const map = new Map<string, { sessionId: string; splitName: string }>();
    for (const d of workoutDays ?? []) {
      map.set(d.date, { sessionId: d.sessionId, splitName: d.splitName });
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
    setSelectedSessionId(null);
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
    setSelectedSessionId(null);
  };

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
          const isSelected = workout?.sessionId === selectedSessionId;
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() + 1 &&
            year === today.getFullYear();

          return (
            <button
              key={iso}
              type="button"
              disabled={!workout}
              onClick={() =>
                setSelectedSessionId(
                  workout?.sessionId === selectedSessionId
                    ? null
                    : workout?.sessionId ?? null
                )
              }
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition ${
                workout
                  ? "cursor-pointer hover:bg-zinc-800"
                  : "cursor-default text-zinc-600"
              } ${isSelected ? "bg-brand/20 ring-1 ring-brand" : ""} ${
                isToday ? "font-bold text-brand" : "text-zinc-300"
              }`}
            >
              {day}
              {workout && (
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </div>

      {selectedSessionId && <DaySummary sessionId={selectedSessionId} />}
    </div>
  );
}
