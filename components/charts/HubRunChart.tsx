"use client";

import { useMemo } from "react";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { ACTIVITY_FILL } from "@/lib/activity";
import type { RunProgressPoint } from "@/lib/queries";
import {
  formatCardioSetLine,
  formatLocaleNumber,
  formatPace,
  formatPaceDelta,
} from "@/lib/utils";

const TICK = "#a1a1aa";
const MAX_RUNS = 16;

type ChartRow = RunProgressPoint & { value: number };

export function HubRunChart({ runs }: { runs: RunProgressPoint[] }) {
  const { rows, metric } = useMemo(() => {
    const recent = runs.slice(-MAX_RUNS);
    const withPace = recent.filter((r) => r.paceMinPerKm != null);
    const usePace = withPace.length >= 2;
    const source = usePace ? withPace : recent;
    const chartRows: ChartRow[] = source.map((r) => ({
      ...r,
      value: usePace ? r.paceMinPerKm! : r.distanceKm,
    }));
    return {
      rows: chartRows,
      metric: usePace ? ("pace" as const) : ("distance" as const),
    };
  }, [runs]);

  const latest = runs.at(-1);
  if (!latest) return null;

  const paced = runs.filter((r) => r.paceMinPerKm != null);
  const latestPaced = paced.at(-1);
  const previousPaced = paced.at(-2);
  const paceChange =
    latestPaced?.paceMinPerKm != null && previousPaced?.paceMinPerKm != null
      ? formatPaceDelta(latestPaced.paceMinPerKm, previousPaced.paceMinPerKm)
      : null;
  const showLastPaceLabel =
    latest.paceMinPerKm == null && latestPaced?.paceMinPerKm != null;

  return (
    <div>
      <p className="mb-2 text-sm text-zinc-300">
        {formatCardioSetLine(latest.distanceKm, latest.durationMin)}
        {latest.paceMinPerKm != null && (
          <span className="text-zinc-400">
            {" "}
            · {formatPace(latest.paceMinPerKm)} /km
          </span>
        )}
        {showLastPaceLabel && latestPaced.paceMinPerKm != null && (
          <span className="text-zinc-400">
            {" "}
            · last pace {formatPace(latestPaced.paceMinPerKm)} /km
          </span>
        )}
        {paceChange && (
          <span
            className={
              paceChange.direction === "up"
                ? "text-green-500"
                : paceChange.direction === "down"
                  ? "text-red-400"
                  : "text-zinc-400"
            }
          >
            {" "}
            · {paceChange.label}
          </span>
        )}
      </p>
      {rows.length >= 2 && (
        <ChartContainer height={140}>
          <LineChart
            data={rows}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fill: TICK }}
              interval="preserveStartEnd"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: TICK }}
              domain={["auto", "auto"]}
              width={metric === "pace" ? 40 : 36}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) =>
                metric === "pace"
                  ? formatPace(value)
                  : formatLocaleNumber(value, 1)
              }
              reversed={metric === "pace"}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                fontSize: 13,
                backgroundColor: "#27272a",
                borderColor: "#3f3f46",
                color: "#fafafa",
              }}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as ChartRow | undefined;
                return row?.dateLabel ?? "";
              }}
              formatter={(_value, _name, item) => {
                const row = item.payload as ChartRow;
                const line = formatCardioSetLine(
                  row.distanceKm,
                  row.durationMin
                );
                const pace =
                  row.paceMinPerKm != null
                    ? ` · ${formatPace(row.paceMinPerKm)} /km`
                    : "";
                return [line + pace, row.movementName];
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={ACTIVITY_FILL.run}
              strokeWidth={2}
              dot={{ r: 3, fill: ACTIVITY_FILL.run, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}
