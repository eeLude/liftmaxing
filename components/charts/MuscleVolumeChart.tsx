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
import type { MuscleVolume } from "@/lib/queries";
import { getIsoWeekDay } from "@/lib/utils";
import {
  getVolumeSetStatus,
  VOLUME_SET_MAX,
  VOLUME_SET_MIN,
  VOLUME_SET_STATUS_COLOR,
} from "@/lib/muscleGroups";

const GRID = "#3f3f46";
const TICK = "#a1a1aa";

export function MuscleVolumeChart({ data }: { data: MuscleVolume[] }) {
  const dayOfWeek = getIsoWeekDay();

  return (
    <div>
      <p className="mb-1 text-xs text-zinc-500">
        Mon–Sun · {dayOfWeek}/7 days · {VOLUME_SET_MIN}–{VOLUME_SET_MAX} sets
        is a typical hypertrophy range
      </p>
      <p className="mb-3 text-xs text-zinc-500">
        Sets count toward the primary muscle only
      </p>
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
        <span>
          <span
            className="mr-1 inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: VOLUME_SET_STATUS_COLOR.under }}
          />
          Under {VOLUME_SET_MIN}
        </span>
        <span>
          <span
            className="mr-1 inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: VOLUME_SET_STATUS_COLOR.in_range }}
          />
          {VOLUME_SET_MIN}–{VOLUME_SET_MAX}
        </span>
        <span>
          <span
            className="mr-1 inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: VOLUME_SET_STATUS_COLOR.high }}
          />
          Over {VOLUME_SET_MAX}
        </span>
      </div>
      <ChartContainer height={320}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={GRID}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: TICK }}
            allowDecimals={false}
            domain={[0, "auto"]}
          />
          <YAxis
            type="category"
            dataKey="muscle"
            tick={{ fontSize: 11, fill: TICK }}
            width={88}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              fontSize: 13,
              backgroundColor: "#27272a",
              borderColor: "#3f3f46",
              color: "#fafafa",
            }}
            formatter={(value: number) => [`${value} sets`, "This week"]}
          />
          <Bar dataKey="sets" radius={[0, 4, 4, 0]}>
            {data.map((row) => (
              <Cell
                key={row.muscle}
                fill={VOLUME_SET_STATUS_COLOR[getVolumeSetStatus(row.sets)]}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
