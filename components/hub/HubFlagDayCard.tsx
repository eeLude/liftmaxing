"use client";

import { Flag } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";
import { HubCard } from "@/components/hub/HubCard";
import { formatFiDateShort, toDateString } from "@/lib/dates";
import { flagGlance } from "@/lib/flag-days";

export function HubFlagDayCard() {
  const { t } = useLocale();
  const todayIso = toDateString(new Date());
  const { today, next, daysUntilNext } = flagGlance(todayIso);
  if (!today) return null;

  const daysUntilLabel =
    daysUntilNext === 1
      ? t("hub.flagDay.tomorrow")
      : t("hub.flagDay.inDays", { days: daysUntilNext });

  return (
    <HubCard
      title={t("hub.flagDay.title")}
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
            {today.name}
          </p>
          <p className="mt-1 text-sm text-zinc-400">{t("hub.flagDay.today")}</p>
        </div>
        <Flag className="h-10 w-10 shrink-0 text-blue-400" aria-hidden />
      </div>
      <p className="mt-3 text-sm text-zinc-500">
        {t("hub.flagDay.next")} · {next.name} · {formatFiDateShort(next.date)}{" "}
        · {daysUntilLabel}
      </p>
    </HubCard>
  );
}
