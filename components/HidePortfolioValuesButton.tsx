"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  loadHidePortfolioValues,
  saveHidePortfolioValues,
} from "@/lib/portfolio";

export function useHidePortfolioValues() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(loadHidePortfolioValues());
  }, []);

  function toggle() {
    setHidden((prev) => {
      const next = !prev;
      saveHidePortfolioValues(next);
      return next;
    });
  }

  return { hidden, toggle };
}

export function HidePortfolioValuesButton({
  hidden,
  onToggle,
}: {
  hidden: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Show portfolio value" : "Hide portfolio value"}
      title={hidden ? "Show value" : "Hide value"}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
    >
      {hidden ? (
        <EyeOff className="h-4 w-4" aria-hidden />
      ) : (
        <Eye className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
