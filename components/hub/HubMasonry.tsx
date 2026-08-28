"use client";

import {
  Children,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const COL_MIN_PX = 320;
const GAP_PX = 16;

type Pos = { top: number; left: number; width: number };

export function HubMasonry({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [positions, setPositions] = useState<Pos[]>([]);
  const [height, setHeight] = useState(0);

  const items = Children.toArray(children);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pack = () => {
      const width = container.clientWidth;
      if (width <= 0) return;
      const cols = Math.max(1, Math.floor(width / COL_MIN_PX));
      const colWidth = Math.floor((width - GAP_PX * (cols - 1)) / cols);
      const leftover = width - (colWidth * cols + GAP_PX * (cols - 1));
      const colHeights = Array.from({ length: cols }, () => 0);
      const next: Pos[] = [];

      for (let i = 0; i < items.length; i++) {
        const el = itemRefs.current[i];
        const h = el?.offsetHeight ?? 0;
        let col = 0;
        for (let c = 1; c < cols; c++) {
          if (colHeights[c] < colHeights[col]) col = c;
        }
        next.push({
          top: colHeights[col],
          left: col * (colWidth + GAP_PX),
          width: colWidth + (col === cols - 1 ? leftover : 0),
        });
        colHeights[col] += h + GAP_PX;
      }

      const packedHeight = Math.max(0, ...colHeights.map((h) => h - GAP_PX));
      setPositions((prev) => (samePositions(prev, next) ? prev : next));
      setHeight((prev) => (prev === packedHeight ? prev : packedHeight));
    };

    pack();
    const raf = window.requestAnimationFrame(() => pack());

    const ro = new ResizeObserver(() => {
      pack();
    });
    ro.observe(container);
    for (const el of itemRefs.current) {
      if (el) ro.observe(el);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: height > 0 ? height : undefined }}
    >
      {items.map((child, i) => {
        const pos = positions[i];
        return (
          <div
            key={typeof child === "object" && child && "key" in child && child.key != null
              ? String(child.key)
              : i}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="w-full"
            style={
              pos
                ? {
                    position: "absolute",
                    top: pos.top,
                    left: pos.left,
                    width: pos.width,
                  }
                : undefined
            }
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

function samePositions(a: Pos[], b: Pos[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].top !== b[i].top ||
      a[i].left !== b[i].left ||
      a[i].width !== b[i].width
    ) {
      return false;
    }
  }
  return true;
}
