"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2 } from "lucide-react";
import { getPreviousMovementPerformance } from "@/lib/queries";
import { formatPreviousSets } from "@/lib/utils";
import { formatFiDate } from "@/lib/dates";
import type { Movement, SetInput, WorkoutCardDraft } from "@/types/database";

const emptySet = (): SetInput => ({ weight_kg: "", reps: "" });

export function makeEmptySets(count: number): SetInput[] {
  return Array.from({ length: count }, () => emptySet());
}

export function cardFromTemplate(slot: {
  id: string;
  movement_id: string;
  default_sets: number;
  movements: Movement | null;
}): WorkoutCardDraft {
  const movement = slot.movements;
  return {
    cardId: slot.id,
    slotId: slot.id,
    performedMovementId: slot.movement_id,
    performedName: movement?.name ?? "Unknown movement",
    targetMuscle: movement?.target_muscle ?? "Unknown",
    sets: makeEmptySets(slot.default_sets),
    note: "",
  };
}

export function cardFromMovement(movement: Movement): WorkoutCardDraft {
  return {
    cardId: crypto.randomUUID(),
    slotId: null,
    performedMovementId: movement.id,
    performedName: movement.name,
    targetMuscle: movement.target_muscle,
    sets: makeEmptySets(3),
    note: "",
  };
}

export function ExerciseCard({
  draft,
  onChange,
  onRemove,
}: {
  draft: WorkoutCardDraft;
  onChange: (draft: WorkoutCardDraft) => void;
  onRemove: () => void;
}) {
  const lookupId = draft.performedMovementId;

  const { data: previous, isLoading } = useQuery({
    queryKey: ["previous-performance", lookupId],
    queryFn: () => getPreviousMovementPerformance(lookupId),
    enabled: !!lookupId,
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
          <p className="mt-0.5 text-xs text-zinc-600">{draft.targetMuscle}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={copyLastSession}
            disabled={!previous?.sets.length}
            className="flex items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Last
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:border-red-500/50 hover:text-red-400"
            aria-label="Remove exercise"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
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
              inputMode="numeric"
              placeholder="reps"
              value={set.reps}
              onChange={(e) => updateSet(index, "reps", e.target.value)}
              className="w-16 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-base"
            />
            <span className="text-zinc-500">×</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="kg"
              value={set.weight_kg}
              onChange={(e) => updateSet(index, "weight_kg", e.target.value)}
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-base"
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
        placeholder="Note"
        value={draft.note}
        onChange={(e) => onChange({ ...draft, note: e.target.value })}
        className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm placeholder:text-zinc-600"
      />
    </div>
  );
}
