"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/charts/ChartContainer";
import type { WeeklyTrainingVolume } from "@/lib/queries";

const GRID = "#3f3f46";
const TICK = "#a1a1aa";
const CURRENT = "#60a5fa";
const PAST = "#004cff";

export function WeeklyTrainingVolumeChart({
  data,
}: {
  data: WeeklyTrainingVolume[];
}) {
  const hasSets = data.some((row) => row.sets > 0);
  const current = data.find((row) => row.isCurrentWeek);

  if (!hasSets) {
    return (
      <p className="text-sm text-zinc-500">
        Log a workout to see weekly training sets.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-zinc-500">
        {current != null ? (
          <>
            This week: {current.sets} set{current.sets === 1 ? "" : "s"} ·{" "}
            {current.sessions} session{current.sessions === 1 ? "" : "s"} (in
            progress)
          </>
        ) : (
          "Lifting sets per Monday–Sunday week"
        )}
      </p>
      <ChartContainer height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: TICK }} />
          <YAxis
            tick={{ fontSize: 11, fill: TICK }}
            allowDecimals={false}
            width={32}
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
                | WeeklyTrainingVolume
                | undefined;
              if (!row) return "";
              return row.isCurrentWeek
                ? `${row.weekLabel} (in progress)`
                : row.weekLabel;
            }}
            formatter={(value, _name, item) => {
              const row = item.payload as WeeklyTrainingVolume;
              const sessionLabel =
                row.sessions === 1 ? "session" : "sessions";
              return [
                `${value} sets · ${row.sessions} ${sessionLabel}`,
                "Lifting sets",
              ];
            }}
          />
          <Bar dataKey="sets" radius={[4, 4, 0, 0]} name="sets">
            {data.map((row) => (
              <Cell
                key={row.week}
                fill={row.isCurrentWeek ? CURRENT : PAST}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
