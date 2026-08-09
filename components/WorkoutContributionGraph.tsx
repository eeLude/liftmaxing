"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { getWorkoutDaysInRange } from "@/lib/queries";
import {
  formatFiDate,
  getContributionDateRange,
  getContributionMonthLabels,
  getContributionWeeks,
} from "@/lib/dates";

/** GitHub profile graph geometry (dark theme) */
const WEEK_COUNT = 53;
const CELL = 10;
const GAP = 3;
const BLOCK = CELL + GAP;
const RADIUS = 2;
const LABEL_W = 27;
const MONTH_H = 17;

/** Row indices for Mon / Wed / Fri when week starts on Sunday */
const DAY_LABELS: { row: number; label: string }[] = [
  { row: 1, label: "Ma" },
  { row: 3, label: "Ke" },
  { row: 5, label: "Pe" },
];

const EMPTY_FILL = "#27272a"; // zinc-800 — matches app surface
const BRAND_FILL = "#004cff";

export function WorkoutContributionGraph() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, end } = getContributionDateRange(WEEK_COUNT);
  const weeks = useMemo(() => getContributionWeeks(WEEK_COUNT), []);
  const monthLabels = useMemo(() => getContributionMonthLabels(weeks), [weeks]);

  const { data: workoutDays } = useQuery({
    queryKey: ["workout-days-range", start, end],
    queryFn: () => getWorkoutDaysInRange(start, end),
  });

  const completedDates = useMemo(() => {
    const set = new Set<string>();
    for (const day of workoutDays ?? []) {
      if (day.isComplete) set.add(day.date);
    }
    return set;
  }, [workoutDays]);

  const width = LABEL_W + weeks.length * BLOCK - GAP;
  const height = MONTH_H + 7 * BLOCK - GAP;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [width]);

  return (
    <div ref={scrollRef} className="overflow-x-auto pb-1">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Viimeisen vuoden treenit"
        className="block"
      >
        {/* Month labels — same x grid as week columns */}
        {monthLabels.map((label, weekIndex) =>
          label ? (
            <text
              key={`month-${weekIndex}`}
              x={LABEL_W + weekIndex * BLOCK}
              y={12}
              className="fill-zinc-500 text-[10px]"
              dominantBaseline="auto"
            >
              {label}
            </text>
          ) : null
        )}

        {/* Weekday labels — Mon, Wed, Fri only */}
        {DAY_LABELS.map(({ row, label }) => (
          <text
            key={label}
            x={0}
            y={MONTH_H + row * BLOCK + CELL - 1}
            className="fill-zinc-500 text-[10px]"
            dominantBaseline="auto"
          >
            {label}
          </text>
        ))}

        {/* Day cells — one column per week, Sunday at top */}
        {weeks.map((week, weekIndex) =>
          week.map((iso, dayIndex) => {
            const x = LABEL_W + weekIndex * BLOCK;
            const y = MONTH_H + dayIndex * BLOCK;
            const done = iso != null && completedDates.has(iso);

            return (
              <rect
                key={`${weekIndex}-${dayIndex}`}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={RADIUS}
                ry={RADIUS}
                fill={done ? BRAND_FILL : EMPTY_FILL}
              >
                {iso && (
                  <title>
                    {formatFiDate(iso)}
                    {done ? " — treeni" : ""}
                  </title>
                )}
              </rect>
            );
          })
        )}
      </svg>
    </div>
  );
}
