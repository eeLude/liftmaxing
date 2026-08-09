"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { useAuth } from "@/components/AuthProvider";
import { getTodayHealthLog, upsertHealthLog } from "@/lib/queries";
import { formatFiDate } from "@/lib/dates";
import { toDateString } from "@/lib/utils";

export default function HealthPage() {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const today = toDateString(new Date());

  const { data: todayLog, isLoading } = useQuery({
    queryKey: ["health-today"],
    queryFn: getTodayHealthLog,
  });

  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");

  useEffect(() => {
    if (!todayLog) return;
    if (todayLog.weight_kg != null) setWeight(String(todayLog.weight_kg));
    if (todayLog.calories != null) setCalories(String(todayLog.calories));
  }, [todayLog]);

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertHealthLog(
        today,
        weight ? parseFloat(weight) : null,
        calories ? parseInt(calories, 10) : null
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-today"] });
      queryClient.invalidateQueries({ queryKey: ["health-logs"] });
    },
  });

  return (
    <MobileLayout>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Health Log</h1>
          <p className="text-sm text-zinc-400">{formatFiDate(today)}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Sign out
        </button>
      </header>

      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        {isLoading && (
          <p className="text-sm text-zinc-500">Loading today&apos;s log...</p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-300">
            Body Weight (kg)
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="e.g. 82.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-lg"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-300">
            Total Calories
          </span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 2800"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-lg"
          />
        </label>

        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-semibold text-white disabled:opacity-60"
        >
          <Save className="h-5 w-5" />
          {saveMutation.isPending ? "Saving..." : "Save Today"}
        </button>

        {saveMutation.isSuccess && (
          <p className="text-center text-sm text-emerald-400">Saved!</p>
        )}
      </div>
    </MobileLayout>
  );
}
