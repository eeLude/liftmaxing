"use client";

import { useMemo } from "react";
import { FI_WEEKDAYS, formatFiMonthYear, toDateString } from "@/lib/dates";
import type { WorkoutDay } from "@/lib/queries";

function monthGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export function HubMonthActivity({ days }: { days: WorkoutDay[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayIso = toDateString(now);
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;

  const byDate = useMemo(() => {
    const map = new Map<string, WorkoutDay>();
    for (const d of days) map.set(d.date, d);
    return map;
  }, [days]);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);

  const completedThisMonth = days.filter(
    (d) => d.isComplete && d.date.startsWith(monthPrefix)
  ).length;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          This month
        </h3>
        <p className="text-xs text-zinc-400">
          {completedThisMonth} workout{completedThisMonth === 1 ? "" : "s"} ·{" "}
          {formatFiMonthYear(year, month)}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-zinc-500">
        {FI_WEEKDAYS.map((d) => (
          <div key={d} className="py-0.5">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          const iso = `${monthPrefix}${String(day).padStart(2, "0")}`;
          const workout = byDate.get(iso);
          const isFuture = iso > todayIso;
          const isToday = iso === todayIso;

          let fill = "bg-zinc-800";
          if (workout?.isComplete) fill = "bg-brand";
          else if (workout) fill = "bg-brand/40";
          if (isFuture) fill = "bg-zinc-800/40";

          return (
            <div
              key={iso}
              title={iso}
              className={`aspect-square rounded-md ${fill} ${
                isToday ? "ring-1 ring-zinc-400" : ""
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
