"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n/messages";

const options: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "fi", label: "FI" },
];

export function LocaleToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={`inline-flex rounded-lg border border-zinc-700 p-0.5 ${className}`}
      role="group"
      aria-label="Language"
    >
      {options.map(({ value, label }) => {
        const active = locale === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
