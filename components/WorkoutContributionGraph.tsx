"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { getWorkoutDaysInRange } from "@/lib/queries";
import {
  ChartSkeleton,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import {
  CONTRIBUTION_DAY_LABEL_ROWS,
  CONTRIBUTION_DAY_LABELS,
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

const EMPTY_FILL = "#27272a"; // zinc-800 — matches app surface
const BRAND_FILL = "#004cff";
const IN_PROGRESS_FILL = "#004cff80";

export function WorkoutContributionGraph() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, end } = getContributionDateRange(WEEK_COUNT);
  const weeks = useMemo(() => getContributionWeeks(WEEK_COUNT), []);
  const monthLabels = useMemo(() => getContributionMonthLabels(weeks), [weeks]);

  const { data: workoutDays, isLoading, isError, refetch } = useQuery({
    queryKey: ["workout-days-range", start, end],
    queryFn: () => getWorkoutDaysInRange(start, end),
  });

  const dayStatus = useMemo(() => {
    const map = new Map<string, "complete" | "in-progress">();
    for (const day of workoutDays ?? []) {
      map.set(day.date, day.isComplete ? "complete" : "in-progress");
    }
    return map;
  }, [workoutDays]);

  const width = LABEL_W + weeks.length * BLOCK - GAP;
  const height = MONTH_H + 7 * BLOCK - GAP;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [width]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (isError) {
    return (
      <QueryErrorBanner
        message="Could not load training activity."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div ref={scrollRef} className="overflow-x-auto pb-1">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Last year of training activity"
        className="block"
      >
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

        {CONTRIBUTION_DAY_LABELS.map((label, index) => (
          <text
            key={label}
            x={0}
            y={MONTH_H + CONTRIBUTION_DAY_LABEL_ROWS[index] * BLOCK + CELL - 1}
            className="fill-zinc-500 text-[10px]"
            dominantBaseline="auto"
          >
            {label}
          </text>
        ))}

        {weeks.map((week, weekIndex) =>
          week.map((iso, dayIndex) => {
            const x = LABEL_W + weekIndex * BLOCK;
            const y = MONTH_H + dayIndex * BLOCK;
            const status = iso != null ? dayStatus.get(iso) : undefined;
            const fill =
              status === "complete"
                ? BRAND_FILL
                : status === "in-progress"
                  ? IN_PROGRESS_FILL
                  : EMPTY_FILL;

            return (
              <rect
                key={`${weekIndex}-${dayIndex}`}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={RADIUS}
                ry={RADIUS}
                fill={fill}
              >
                {iso && (
                  <title>
                    {formatFiDate(iso)}
                    {status === "complete"
                      ? " — workout complete"
                      : status === "in-progress"
                        ? " — in progress"
                        : ""}
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
