"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { formatFiDate } from "@/lib/dates";
import { getWeeklyWeightChange, rollingAverage } from "@/lib/utils";
import type { HealthLog } from "@/types/database";

const GRID = "#3f3f46";
const TICK = "#a1a1aa";

export function BodyWeightChart({ logs }: { logs: HealthLog[] }) {
  const chartData = useMemo(() => {
    const withWeight = logs.filter((l) => l.weight_kg != null);
    const weights = withWeight.map((l) => Number(l.weight_kg));
    const avgWeights = rollingAverage(weights, 7);

    return withWeight.map((log, i) => ({
      date: log.date,
      dateLabel: formatFiDate(log.date),
      weight: Number(log.weight_kg),
      weightAvg: avgWeights[i],
    }));
  }, [logs]);

  const latest = chartData.at(-1)?.weight;
  const weeklyChange = getWeeklyWeightChange(chartData);

  if (!chartData.length) {
    return (
      <p className="text-sm text-zinc-500">
        Log body weight on the Health tab to track trends.
      </p>
    );
  }

  return (
    <div>
      {latest != null && (
        <p className="mb-3 text-sm text-zinc-400">
          <span className="text-zinc-300">Latest {latest} kg</span>
          {weeklyChange != null && (
            <span className="ml-2">
              · Weekly {weeklyChange > 0 ? "+" : ""}
              {weeklyChange} kg
            </span>
          )}
        </p>
      )}
      <ChartContainer height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: TICK }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: TICK }}
            domain={["auto", "auto"]}
            unit="kg"
            width={42}
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
              const row = payload?.[0]?.payload as { dateLabel?: string } | undefined;
              return row?.dateLabel ?? "";
            }}
            formatter={(value: number, name: string) => [
              `${value} kg`,
              name === "weightAvg" ? "7-day avg" : "Weight",
            ]}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#004cff"
            strokeWidth={2}
            dot={false}
            name="weight"
          />
          <Line
            type="monotone"
            dataKey="weightAvg"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="weightAvg"
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
