"use client";

import { MOOD_OPTIONS, type MoodScore } from "@/lib/mood";

export function MoodPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (score: MoodScore) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {MOOD_OPTIONS.map((option) => {
        const selected = value === option.score;
        return (
          <button
            key={option.score}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.score)}
            className={`rounded-xl px-1 py-2.5 text-center text-[11px] font-semibold leading-tight disabled:opacity-60 bg-zinc-800 text-zinc-300 ${option.hover} ${
              selected ? "ring-2 ring-zinc-400" : "ring-1 ring-transparent"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
