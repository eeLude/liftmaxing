"use client";

import { useMemo } from "react";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { formatFiDate } from "@/lib/dates";
import { formatEur, type QuotePoint } from "@/lib/portfolio";
import { formatLocaleNumber } from "@/lib/utils";

const TICK = "#a1a1aa";

export function HubPortfolioChart({
  history,
  hideValues = false,
}: {
  history: QuotePoint[];
  hideValues?: boolean;
}) {
  const chartData = useMemo(
    () =>
      history.map((point) => ({
        date: point.date,
        dateLabel: formatFiDate(point.date),
        value: point.close,
      })),
    [history]
  );

  if (chartData.length < 2) return null;

  return (
    <div className="mt-3">
      <ChartContainer height={120}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: TICK }}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={hideValues ? false : { fontSize: 10, fill: TICK }}
            domain={["auto", "auto"]}
            width={hideValues ? 8 : 44}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatLocaleNumber(value, 0)}
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
            formatter={(value) => [
              hideValues ? "•••• €" : formatEur(Number(value), 0),
              "Value",
            ]}
          />
          <Line
            type="monotone"
            dataKey="value"
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
