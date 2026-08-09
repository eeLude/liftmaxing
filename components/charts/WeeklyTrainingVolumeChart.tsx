"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/charts/ChartContainer";
import type { WeeklyTrainingVolume } from "@/lib/queries";

const GRID = "#3f3f46";
const TICK = "#a1a1aa";

export function WeeklyTrainingVolumeChart({
  data,
}: {
  data: WeeklyTrainingVolume[];
}) {
  if (!data.length) {
    return (
      <p className="text-sm text-zinc-500">
        Log a workout to see weekly training volume.
      </p>
    );
  }

  return (
    <ChartContainer height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: TICK }} />
        <YAxis tick={{ fontSize: 11, fill: TICK }} allowDecimals={false} width={32} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            fontSize: 13,
            backgroundColor: "#27272a",
            borderColor: "#3f3f46",
            color: "#fafafa",
          }}
          formatter={(value: number, name: string) => {
            if (name === "sets") return [`${value} sets`, "Total sets"];
            return [`${value}`, "Sessions"];
          }}
        />
        <Bar dataKey="sets" fill="#004cff" radius={[4, 4, 0, 0]} name="sets" />
      </BarChart>
    </ChartContainer>
  );
}
