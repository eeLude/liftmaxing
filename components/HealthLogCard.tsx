"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  getTodayHealthLog,
  getUserProfile,
  upsertHealthLog,
  upsertUserGoal,
} from "@/lib/queries";
import { formatFiDate, toDateString } from "@/lib/dates";
import {
  GOAL_LABELS,
  GOAL_TYPES,
  getGoalBandCopy,
  type GoalType,
} from "@/lib/goals";
import { formatLocaleNumber, parseLocaleNumber } from "@/lib/utils";

export function HealthLogCard() {
  const queryClient = useQueryClient();
  const today = toDateString(new Date());

  const { data: todayLog, isLoading } = useQuery({
    queryKey: ["health-today"],
    queryFn: getTodayHealthLog,
  });

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: getUserProfile,
  });

  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");

  useEffect(() => {
    if (!todayLog) return;
    if (todayLog.weight_kg != null) {
      setWeight(formatLocaleNumber(Number(todayLog.weight_kg), 2));
    }
    if (todayLog.calories != null) setCalories(String(todayLog.calories));
  }, [todayLog]);

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertHealthLog(
        today,
        weight ? parseLocaleNumber(weight) : null,
        calories ? parseInt(calories, 10) : null
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-today"] });
      queryClient.invalidateQueries({ queryKey: ["health-logs"] });
    },
  });

  const goalMutation = useMutation({
    mutationFn: (goalType: GoalType) => upsertUserGoal(goalType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  const selectedGoal = profile?.goal_type ?? null;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-300">Goal</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {selectedGoal
              ? getGoalBandCopy(selectedGoal)
              : "Choose a goal so weight change can be judged."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {GOAL_TYPES.map((goal) => {
            const active = selectedGoal === goal;
            return (
              <button
                key={goal}
                type="button"
                disabled={goalMutation.isPending}
                onClick={() => goalMutation.mutate(goal)}
                className={`rounded-xl border py-2.5 text-sm font-medium disabled:opacity-60 ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {GOAL_LABELS[goal]}
              </button>
            );
          })}
        </div>
        {goalMutation.isError && (
          <p className="text-sm text-red-400">
            {goalMutation.error instanceof Error
              ? goalMutation.error.message
              : "Could not save goal. Run the user_profiles migration if this table is missing."}
          </p>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-zinc-500">Loading today&apos;s log...</p>
      )}

      <p className="text-xs text-zinc-500">{formatFiDate(today)}</p>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-300">
          Body Weight (kg)
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="e.g. 82,5"
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

      {saveMutation.isError && (
        <p className="text-center text-sm text-red-400">
          {saveMutation.error instanceof Error
            ? saveMutation.error.message
            : "Failed to save. Check your connection and try again."}
        </p>
      )}
    </div>
  );
}
