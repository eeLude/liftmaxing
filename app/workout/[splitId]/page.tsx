"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { use, useCallback, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { MobileLayout } from "@/components/MobileLayout";
import { RunWorkoutForm } from "@/components/RunWorkoutForm";
import {
  createWorkoutSession,
  findOrCreateMovement,
  getAllMovements,
  getPreviousMovementPerformance,
  getSplitById,
  getSplitTemplate,
  saveSessionExercise,
} from "@/lib/queries";
import { formatPreviousSets } from "@/lib/utils";
import { formatFiDate } from "@/lib/dates";
import type { ExerciseDraft, SetInput, SplitExercise } from "@/types/database";

const emptySet = (): SetInput => ({ weight_kg: "", reps: "" });

function makeEmptySets(count: number): SetInput[] {
  return Array.from({ length: count }, () => emptySet());
}

function ExerciseCard({
  slot,
  draft,
  allMovements,
  onChange,
}: {
  slot: SplitExercise;
  draft: ExerciseDraft;
  allMovements: { id: string; name: string; target_muscle: string }[];
  onChange: (draft: ExerciseDraft) => void;
}) {
  const templateName = slot.movements.name;
  const lookupId = draft.performedMovementId;

  const { data: previous, isLoading } = useQuery({
    queryKey: ["previous-performance", lookupId],
    queryFn: () => getPreviousMovementPerformance(lookupId),
  });

  const copyLastSession = () => {
    if (!previous?.sets.length) return;
    onChange({
      ...draft,
      sets: previous.sets.map((s) => ({
        weight_kg: String(s.weight_kg),
        reps: String(s.reps),
      })),
      note: previous.note ?? draft.note,
    });
  };

  const replaceMovement = (movementId: string) => {
    const movement = allMovements.find((m) => m.id === movementId);
    if (!movement) return;
    onChange({
      ...draft,
      performedMovementId: movement.id,
      performedName: movement.name,
      targetMuscle: movement.target_muscle,
      isSubstituted: movement.id !== draft.templateMovementId,
      sets: makeEmptySets(draft.defaultSets),
      note: "",
    });
  };

  const resetToTemplate = () => {
    onChange({
      ...draft,
      performedMovementId: draft.templateMovementId,
      performedName: templateName,
      targetMuscle: slot.movements.target_muscle,
      isSubstituted: false,
      sets: makeEmptySets(draft.defaultSets),
      note: "",
    });
  };

  const updateSet = (index: number, field: keyof SetInput, value: string) => {
    const sets = [...draft.sets];
    sets[index] = { ...sets[index], [field]: value };
    onChange({ ...draft, sets });
  };

  const addSet = () => {
    onChange({ ...draft, sets: [...draft.sets, emptySet()] });
  };

  const removeSet = (index: number) => {
    if (draft.sets.length <= 1) return;
    onChange({ ...draft, sets: draft.sets.filter((_, i) => i !== index) });
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-zinc-100">
            {draft.performedName}
          </h3>
          {draft.isSubstituted && (
            <p className="mt-0.5 text-xs text-zinc-500">
              Replacing: {templateName}
            </p>
          )}
          <p className="mt-0.5 text-xs text-zinc-600">
            {draft.defaultSets} sets planned · {draft.targetMuscle}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={copyLastSession}
            disabled={!previous?.sets.length}
            className="flex items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Last
          </button>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <select
          value={draft.performedMovementId}
          onChange={(e) => replaceMovement(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs"
          aria-label="Replace movement"
        >
          {allMovements.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {draft.isSubstituted && (
          <button
            type="button"
            onClick={resetToTemplate}
            className="flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400"
            title="Reset to template"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mb-3 space-y-1 text-sm text-zinc-500">
        {isLoading ? (
          <p>Loading previous...</p>
        ) : previous ? (
          <>
            <p>
              Last time ({formatFiDate(previous.sessionDate)}):{" "}
              {formatPreviousSets(previous.sets)}
            </p>
            {previous.note && (
              <p className="italic">&ldquo;{previous.note}&rdquo;</p>
            )}
          </>
        ) : (
          <p>No previous session for this movement</p>
        )}
      </div>

      <div className="space-y-2">
        {draft.sets.map((set, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-6 text-center text-sm font-medium text-zinc-500">
              {index + 1}
            </span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="kg"
              value={set.weight_kg}
              onChange={(e) => updateSet(index, "weight_kg", e.target.value)}
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-base"
            />
            <span className="text-zinc-500">×</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="reps"
              value={set.reps}
              onChange={(e) => updateSet(index, "reps", e.target.value)}
              className="w-16 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-base"
            />
            <button
              type="button"
              onClick={() => removeSet(index)}
              className="ml-auto p-2 text-zinc-600 hover:text-red-400"
              aria-label="Remove set"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        className="mt-2 flex items-center gap-1 text-sm font-medium text-brand"
      >
        <Plus className="h-4 w-4" />
        Add set
      </button>

      <input
        type="text"
        placeholder="Exercise note (e.g. felt too light)"
        value={draft.note}
        onChange={(e) => onChange({ ...draft, note: e.target.value })}
        className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
      />
    </div>
  );
}

export default function ActiveWorkoutPage({
  params,
}: {
  params: Promise<{ splitId: string }>;
}) {
  const { splitId } = use(params);
  const router = useRouter();

  const splitQuery = useQuery({
    queryKey: ["split", splitId],
    queryFn: () => getSplitById(splitId),
  });

  const templateQuery = useQuery({
    queryKey: ["split-template", splitId],
    queryFn: () => getSplitTemplate(splitId),
  });

  const movementsQuery = useQuery({
    queryKey: ["movements"],
    queryFn: getAllMovements,
  });

  const [drafts, setDrafts] = useState<Record<string, ExerciseDraft>>({});

  const getDraft = useCallback(
    (slot: SplitExercise): ExerciseDraft => {
      if (drafts[slot.id]) return drafts[slot.id];
      return {
        slotId: slot.id,
        templateMovementId: slot.movement_id,
        performedMovementId: slot.movement_id,
        performedName: slot.movements.name,
        targetMuscle: slot.movements.target_muscle,
        defaultSets: slot.default_sets,
        sets: makeEmptySets(slot.default_sets),
        note: "",
        isSubstituted: false,
      };
    },
    [drafts]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const session = await createWorkoutSession(splitId);
      const template = templateQuery.data ?? [];

      for (let i = 0; i < template.length; i++) {
        const slot = template[i];
        const draft = getDraft(slot);
        const validSets = draft.sets
          .filter((s) => s.weight_kg !== "" && s.reps)
          .map((s) => ({
            weight_kg: parseFloat(s.weight_kg),
            reps: parseInt(s.reps, 10),
          }));

        if (validSets.length === 0) continue;

        let movementId = draft.performedMovementId;
        const known = movementsQuery.data?.find((m) => m.id === movementId);
        if (!known && draft.performedName.trim()) {
          const created = await findOrCreateMovement(
            draft.performedName,
            draft.targetMuscle
          );
          movementId = created.id;
        }

        await saveSessionExercise(
          session.id,
          slot.id,
          movementId,
          i + 1,
          validSets,
          draft.note.trim() || null
        );
      }
    },
    onSuccess: () => router.push("/"),
  });

  const isRunSplit = splitQuery.data?.name === "Run";

  return (
    <MobileLayout>
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/workout"
          className="rounded-full p-2 hover:bg-zinc-800"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">
            {splitQuery.data?.name ?? "Workout"}
          </h1>
          <p className="text-sm text-zinc-400">
            {isRunSplit ? "Log your run" : "Log your sets"}
          </p>
        </div>
      </header>

      {isRunSplit ? (
        <RunWorkoutForm splitId={splitId} />
      ) : (
        <>
          <div className="space-y-4">
            {templateQuery.data?.map((slot) => (
              <ExerciseCard
                key={slot.id}
                slot={slot}
                draft={getDraft(slot)}
                allMovements={movementsQuery.data ?? []}
                onChange={(draft) =>
                  setDrafts((prev) => ({ ...prev, [slot.id]: draft }))
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !templateQuery.data?.length}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-lg font-semibold text-white shadow-lg shadow-brand/30 disabled:opacity-60"
          >
            <Check className="h-5 w-5" />
            {saveMutation.isPending ? "Saving..." : "Finish Workout"}
          </button>

          {saveMutation.isError && (
            <p className="mt-2 text-center text-sm text-red-500">
              Failed to save. Check your connection.
            </p>
          )}
        </>
      )}
    </MobileLayout>
  );
}
