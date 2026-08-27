"use client";

import { useMemo } from "react";
import { FI_WEEKDAYS, formatFiMonthYear, toDateString } from "@/lib/dates";
import { moodFill, moodLabel } from "@/lib/mood";
import type { MoodLog } from "@/types/database";

function monthGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export function MoodMonthGrid({
  logs,
  year,
  month,
  onDay,
  hideCaption,
}: {
  logs: MoodLog[];
  year: number;
  month: number;
  onDay?: (iso: string, log: MoodLog | null) => void;
  hideCaption?: boolean;
}) {
  const todayIso = toDateString(new Date());
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;

  const byDate = useMemo(() => {
    const map = new Map<string, MoodLog>();
    for (const log of logs) map.set(log.date, log);
    return map;
  }, [logs]);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);
  const loggedThisMonth = logs.filter((l) => l.date.startsWith(monthPrefix)).length;

  return (
    <div>
      {!hideCaption && (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            This month
          </h3>
          <p className="text-xs text-zinc-400">
            {loggedThisMonth} day{loggedThisMonth === 1 ? "" : "s"} ·{" "}
            {formatFiMonthYear(year, month)}
          </p>
        </div>
      )}
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
          const log = byDate.get(iso) ?? null;
          const isFuture = iso > todayIso;
          const isToday = iso === todayIso;
          const fill = isFuture ? "bg-zinc-800/40" : moodFill(log?.score);

          const className = `aspect-square rounded-md ${fill} ${
            isToday ? "ring-1 ring-zinc-400" : ""
          }`;

          if (onDay && !isFuture) {
            return (
              <button
                key={iso}
                type="button"
                title={
                  log
                    ? `${iso} · ${moodLabel(log.score)}`
                    : iso
                }
                onClick={() => onDay(iso, log)}
                className={className}
              />
            );
          }

          return (
            <div
              key={iso}
              title={log ? `${iso} · ${moodLabel(log.score)}` : iso}
              className={className}
            />
          );
        })}
      </div>
    </div>
  );
}
