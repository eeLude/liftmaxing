"use client";

import { useMemo } from "react";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { formatFiDate } from "@/lib/dates";
import { formatSignedKg } from "@/lib/goals";
import { getWeeklyWeightChange, rollingAverage } from "@/lib/utils";
import type { HealthLog } from "@/types/database";

const TICK = "#a1a1aa";
const MAX_DAYS = 90;

export function HubWeightChart({ logs }: { logs: HealthLog[] }) {
  const chartData = useMemo(() => {
    const withWeight = logs
      .filter((l) => l.weight_kg != null)
      .map((log) => ({
        date: log.date,
        dateLabel: formatFiDate(log.date),
        weight: Number(log.weight_kg),
      }));
    const recent = withWeight.slice(-MAX_DAYS);
    const avgs = rollingAverage(
      recent.map((r) => r.weight),
      7
    );
    return recent.map((row, i) => ({
      ...row,
      weightAvg: avgs[i],
    }));
  }, [logs]);

  const latest = chartData.at(-1)?.weight;
  const weeklyChange = getWeeklyWeightChange(chartData);

  if (!chartData.length) {
    return (
      <p className="text-sm text-zinc-500">
        Log body weight on the Gym page to track trends.
      </p>
    );
  }

  return (
    <div>
      {latest != null && (
        <p className="mb-2 text-sm text-zinc-300">
          {latest} kg
          {weeklyChange != null && (
            <span className="text-zinc-400">
              {" "}
              · {formatSignedKg(weeklyChange)}/wk
            </span>
          )}
        </p>
      )}
      <ChartContainer height={140}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
            width={36}
            axisLine={false}
            tickLine={false}
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
              const row = payload?.[0]?.payload as
                | { dateLabel?: string }
                | undefined;
              return row?.dateLabel ?? "";
            }}
            formatter={(value) => [`${value} kg`, "7-day avg"]}
          />
          <Line
            type="monotone"
            dataKey="weightAvg"
            stroke="#004cff"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
