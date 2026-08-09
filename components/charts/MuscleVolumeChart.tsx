"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MuscleVolume } from "@/lib/queries";

const GRID = "#3f3f46";
const TICK = "#a1a1aa";

export function MuscleVolumeChart({ data }: { data: MuscleVolume[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-zinc-500">
        Log a workout this week to see muscle group volume.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={GRID}
          horizontal={false}
        />
        <XAxis type="number" tick={{ fontSize: 11, fill: TICK }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="muscle"
          tick={{ fontSize: 11, fill: TICK }}
          width={80}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            fontSize: 13,
            backgroundColor: "#27272a",
            borderColor: "#3f3f46",
            color: "#fafafa",
          }}
          formatter={(value: number) => [`${value} sets`, "Volume"]}
        />
        <Bar dataKey="sets" fill="#004cff" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
