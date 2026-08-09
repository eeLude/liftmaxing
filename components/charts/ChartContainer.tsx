"use client";

import { useEffect, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

type ChartContainerProps = {
  height: number;
  children: ReactElement;
};

/** Avoid Recharts ResizeObserver errors when navigating away from dashboard charts. */
export function ChartContainer({ height, children }: ChartContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height }} aria-hidden />;
  }

  return (
    <ResponsiveContainer width="100%" height={height} debounce={50}>
      {children}
    </ResponsiveContainer>
  );
}
