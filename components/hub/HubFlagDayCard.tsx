"use client";

import { Flag } from "lucide-react";
import { HubCard } from "@/components/hub/HubCard";
import { formatFiDateShort, toDateString } from "@/lib/dates";
import { flagGlance } from "@/lib/flag-days";

function daysUntilLabel(days: number): string {
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export function HubFlagDayCard() {
  const todayIso = toDateString(new Date());
  const { today, next, daysUntilNext } = flagGlance(todayIso);
  const headline = today ?? next;

  return (
    <HubCard
      title={today ? "Flag day" : "Next flag day"}
      footer={
        <p className="text-center text-[10px] text-zinc-600">
          FI flag days ·{" "}
          <a
            href="https://intermin.fi/suomen-lippu/liputuspaivat"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-zinc-700 underline-offset-2 hover:text-zinc-400"
          >
            sisäministeriö
          </a>
        </p>
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-zinc-100">
            {headline.name}
          </p>
          {today ? (
            <p className="mt-1 text-sm text-zinc-400">today</p>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">
              {formatFiDateShort(next.date)} · {daysUntilLabel(daysUntilNext)}
            </p>
          )}
        </div>
        <Flag
          className={`h-10 w-10 shrink-0 ${
            today ? "text-blue-400" : "text-zinc-600"
          }`}
          aria-hidden
        />
      </div>
      {today && (
        <p className="mt-3 text-sm text-zinc-500">
          Next · {next.name} · {formatFiDateShort(next.date)} ·{" "}
          {daysUntilLabel(daysUntilNext)}
        </p>
      )}
    </HubCard>
  );
}
