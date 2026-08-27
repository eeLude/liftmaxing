"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
      title="Mood"
      footer={
        <Link
          href="/mood"
          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
        >
          Open mood log
          <ChevronRight className="h-4 w-4" />
        </Link>
      }
    >
      {moodQuery.isError && (
        <QueryErrorBanner
          message="Could not load mood. Run supabase/migrate-mood.sql if the table is missing."
          onRetry={() => void moodQuery.refetch()}
        />
      )}
      {moodQuery.isLoading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}
      <p className="mb-3 text-sm text-zinc-500">
        {todayLog
          ? `Today · ${moodLabel(todayLog.score)}`
          : "How are you today?"}
      </p>
      <MoodPicker
        value={todayLog?.score ?? null}
        disabled={saveMutation.isPending || moodQuery.isLoading}
        onChange={(score) => saveMutation.mutate(score)}
      />
      {saveMutation.isError && (
        <p className="mt-2 text-sm text-red-400">
          Could not save. Run supabase/migrate-mood.sql if the table is missing.
        </p>
      )}
      <div className="mt-4 flex items-end gap-1">
        {weekDays.map((iso) => {
          const log = logs.find((l) => l.date === iso);
          return (
            <div
              key={iso}
              title={log ? `${iso} · ${moodLabel(log.score)}` : iso}
              className={`h-6 flex-1 rounded-sm ${moodFill(log?.score)} ${
                iso === today ? "ring-1 ring-zinc-400" : ""
              }`}
            />
          );
        })}
      </div>
      {(weekAvg || streak > 0) && (
        <p className="mt-2 text-sm text-zinc-500">
          {weekAvg ? `Week avg ${weekAvg}` : null}
          {weekAvg && streak > 0 ? " · " : null}
          {streak > 0
            ? `${streak} day${streak === 1 ? "" : "s"} streak`
            : null}
        </p>
      )}
    </HubCard>
  );
}
