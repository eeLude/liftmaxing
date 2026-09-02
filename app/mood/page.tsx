"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useLocale } from "@/components/LocaleProvider";
import { QueryErrorBanner } from "@/components/LoadingStates";
import { MoodMonthGrid } from "@/components/mood/MoodMonthGrid";
import { MoodPicker } from "@/components/mood/MoodPicker";
import { formatFiDate, formatFiMonthYear, toDateString } from "@/lib/dates";
import {
  averageMood,
  formatMoodAverage,
  lastNDays,
  logsInRange,
  moodLabel,
  moodStreak,
  type MoodScore,
} from "@/lib/mood";
import { deleteMoodLog, getMoodLogs, upsertMoodLog } from "@/lib/queries";
import type { MoodLog } from "@/types/database";

export default function MoodPage() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const today = toDateString(new Date());
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today);
  const [note, setNote] = useState("");

  const moodQuery = useQuery({
    queryKey: ["mood-logs"],
    queryFn: () => getMoodLogs(400),
  });

  const logs = moodQuery.data ?? [];
  const selectedLog = logs.find((l) => l.date === selectedDate) ?? null;
  const weekStart = lastNDays(today, 7)[0];
  const weekAvg = formatMoodAverage(
    averageMood(logsInRange(logs, weekStart, today))
  );
  const streak = moodStreak(logs, today);

  useEffect(() => {
    setNote(selectedLog?.note ?? "");
  }, [selectedLog?.id, selectedLog?.note, selectedDate]);

  const notes = useMemo(
    () => logs.filter((l) => l.note).slice(0, 12),
    [logs]
  );

  const saveMutation = useMutation({
    mutationFn: ({
      date,
      score,
      nextNote,
    }: {
      date: string;
      score: number;
      nextNote: string | null;
    }) => upsertMoodLog(date, score, nextNote),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mood-logs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (date: string) => deleteMoodLog(date),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mood-logs"] });
    },
  });

  const handleScore = (score: MoodScore) => {
    saveMutation.mutate({
      date: selectedDate,
      score,
      nextNote: note.trim() || null,
    });
  };

  const handleSaveNote = () => {
    if (!selectedLog) return;
    const next = note.trim() || null;
    if ((selectedLog.note ?? null) === next) return;
    saveMutation.mutate({
      date: selectedDate,
      score: selectedLog.score,
      nextNote: next,
    });
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  };

  const handleDay = (iso: string, log: MoodLog | null) => {
    setSelectedDate(iso);
    setNote(log?.note ?? "");
  };

  return (
    <MobileLayout>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {t("moodPage.title")}
          </h1>
          <p className="text-sm text-zinc-400">{t("moodPage.subtitle")}</p>
        </div>
        <LocaleToggle />
      </header>

      {moodQuery.isError && (
        <QueryErrorBanner
          message={t("moodPage.error")}
          onRetry={() => void moodQuery.refetch()}
        />
      )}

      {(weekAvg || streak > 0) && (
        <p className="mb-4 text-sm text-zinc-400">
          {weekAvg ? t("hub.mood.weekAvgFmt", { avg: weekAvg }) : null}
          {weekAvg && streak > 0 ? " · " : null}
          {streak > 0
            ? t(streak === 1 ? "hub.mood.streakFmt" : "hub.mood.streaksFmt", {
                count: streak,
              })
            : null}
        </p>
      )}

      <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="mb-3 text-sm font-medium text-zinc-300">
          {selectedDate === today
            ? t("hub.mood.todayPrefix")
            : formatFiDate(selectedDate)}
          {selectedLog
            ? ` · ${moodLabel(selectedLog.score, locale)}`
            : ""}
        </p>
        <MoodPicker
          value={selectedLog?.score ?? null}
          disabled={saveMutation.isPending}
          onChange={handleScore}
        />
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-400">
            {t("moodPage.note")}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleSaveNote}
            rows={3}
            disabled={!selectedLog}
            className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm disabled:opacity-50"
            placeholder={
              selectedLog ? t("moodPage.noteOptional") : t("moodPage.pickMoodFirst")
            }
          />
        </label>
        {selectedLog && (
          <button
            type="button"
            onClick={() => deleteMutation.mutate(selectedDate)}
            disabled={deleteMutation.isPending}
            className="mt-3 w-full py-2 text-sm text-red-400 disabled:opacity-50"
          >
            {t("moodPage.clear")}
          </button>
        )}
        {saveMutation.isError && (
          <p className="mt-2 text-sm text-red-400">{t("hub.mood.saveError")}</p>
        )}
      </section>

      <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-full p-2 hover:bg-zinc-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium text-zinc-300">
            {formatFiMonthYear(viewYear, viewMonth)}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-full p-2 hover:bg-zinc-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <MoodMonthGrid
          logs={logs}
          year={viewYear}
          month={viewMonth}
          onDay={handleDay}
          hideCaption
        />
      </section>

      {notes.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            {t("moodPage.recentNotes")}
          </h2>
          <ul className="space-y-2">
            {notes.map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => handleDay(log.date, log)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left hover:border-zinc-600"
                >
                  <p className="text-sm font-medium text-zinc-100">
                    {formatFiDate(log.date)} · {moodLabel(log.score, locale)}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm text-zinc-400">
                    {log.note}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </MobileLayout>
  );
}
