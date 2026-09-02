"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";
import { HubCard } from "@/components/hub/HubCard";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import { MoodPicker } from "@/components/mood/MoodPicker";
import { toDateString } from "@/lib/dates";
import {
  averageMood,
  formatMoodAverage,
  lastNDays,
  logsInRange,
  moodFill,
  moodLabel,
  moodStreak,
  type MoodScore,
} from "@/lib/mood";
import { getMoodLogs, upsertMoodLog } from "@/lib/queries";

export function HubMoodCard() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const today = toDateString(new Date());
  const weekStart = lastNDays(today, 7)[0];

  const moodQuery = useQuery({
    queryKey: ["mood-logs"],
    queryFn: () => getMoodLogs(90),
  });

  const logs = moodQuery.data ?? [];
  const todayLog = logs.find((l) => l.date === today) ?? null;
  const weekLogs = logsInRange(logs, weekStart, today);
  const weekAvg = formatMoodAverage(averageMood(weekLogs));
  const streak = moodStreak(logs, today);
  const weekDays = lastNDays(today, 7);

  const saveMutation = useMutation({
    mutationFn: (score: MoodScore) =>
      upsertMoodLog(today, score, todayLog?.note ?? null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mood-logs"] });
    },
  });

  return (
    <HubCard
      title={t("card.mood")}
      footer={
        <Link
          href="/mood"
          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
        >
          {t("hub.mood.openLog")}
          <ChevronRight className="h-4 w-4" />
        </Link>
      }
    >
      {moodQuery.isError && (
        <QueryErrorBanner
          message={t("hub.mood.error")}
          onRetry={() => void moodQuery.refetch()}
        />
      )}
      {moodQuery.isLoading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          {t("common.loading")}
        </div>
      )}
      <p className="mb-3 text-sm text-zinc-500">
        {todayLog
          ? `${t("hub.mood.todayPrefix")} · ${moodLabel(todayLog.score, locale)}`
          : t("hub.mood.today")}
      </p>
      <MoodPicker
        value={todayLog?.score ?? null}
        disabled={saveMutation.isPending || moodQuery.isLoading}
        onChange={(score) => saveMutation.mutate(score)}
      />
      {saveMutation.isError && (
        <p className="mt-2 text-sm text-red-400">{t("hub.mood.saveError")}</p>
      )}
      <div className="mt-4 flex items-end gap-1">
        {weekDays.map((iso) => {
          const log = logs.find((l) => l.date === iso);
          return (
            <div
              key={iso}
              title={
                log
                  ? `${iso} · ${moodLabel(log.score, locale)}`
                  : iso
              }
              className={`h-6 flex-1 rounded-sm ${moodFill(log?.score)} ${
                iso === today ? "ring-1 ring-zinc-400" : ""
              }`}
            />
          );
        })}
      </div>
      {(weekAvg || streak > 0) && (
        <p className="mt-2 text-sm text-zinc-500">
          {weekAvg ? t("hub.mood.weekAvgFmt", { avg: weekAvg }) : null}
          {weekAvg && streak > 0 ? " · " : null}
          {streak > 0
            ? t(streak === 1 ? "hub.mood.streakFmt" : "hub.mood.streaksFmt", {
                count: streak,
              })
            : null}
        </p>
      )}
    </HubCard>
  );
}
