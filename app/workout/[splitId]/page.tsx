"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { MobileLayout } from "@/components/MobileLayout";
import { RunWorkoutForm } from "@/components/RunWorkoutForm";
import {
  createWorkoutSession,
  getAllMovements,
  getPreviousMovementPerformance,
  getSplitById,
  getSplitTemplate,
  saveSessionExercise,
} from "@/lib/queries";
import { formatPreviousSets } from "@/lib/utils";
import { formatFiDate } from "@/lib/dates";
import type { Movement, SetInput, WorkoutCardDraft } from "@/types/database";

const emptySet = (): SetInput => ({ weight_kg: "", reps: "" });

function makeEmptySets(count: number): SetInput[] {
  return Array.from({ length: count }, () => emptySet());
}

function cardFromTemplate(slot: {
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

function cardFromMovement(movement: Movement): WorkoutCardDraft {
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

function ExerciseCard({
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

function MovementPicker({
  movements,
  onSelect,
  onClose,
}: {
  movements: Movement[];
  onSelect: (movement: Movement) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? movements.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.target_muscle.toLowerCase().includes(q)
        )
      : movements;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [movements, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Movement[]>();
    for (const m of filtered) {
      const group = map.get(m.target_muscle) ?? [];
      group.push(m);
      map.set(m.target_muscle, group);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">Add exercise</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <input
        type="search"
        placeholder="Search movements..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
      />
      <div className="max-h-64 space-y-3 overflow-y-auto">
        {grouped.map(([muscle, items]) => (
          <div key={muscle}>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {muscle}
            </p>
            <div className="space-y-1">
              {items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelect(m)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-500">No movements found.</p>
        )}
      </div>
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

  const [cards, setCards] = useState<WorkoutCardDraft[]>([]);
  const [cardsReady, setCardsReady] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!templateQuery.data || cardsReady) return;
    const initial = templateQuery.data
      .filter((slot) => slot.movements)
      .map((slot) => cardFromTemplate(slot));
    setCards(initial);
    setCardsReady(true);
  }, [templateQuery.data, cardsReady]);

  const updateCard = (cardId: string, draft: WorkoutCardDraft) => {
    setCards((prev) => prev.map((c) => (c.cardId === cardId ? draft : c)));
  };

  const removeCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.cardId !== cardId));
  };

  const addCard = (movement: Movement) => {
    setCards((prev) => [...prev, cardFromMovement(movement)]);
    setShowPicker(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const session = await createWorkoutSession(splitId);

      for (let i = 0; i < cards.length; i++) {
        const draft = cards[i];
        const validSets = draft.sets
          .filter((s) => s.weight_kg !== "" && s.reps)
          .map((s) => ({
            weight_kg: parseFloat(s.weight_kg),
            reps: parseInt(s.reps, 10),
          }));

        if (validSets.length === 0) continue;

        await saveSessionExercise(
          session.id,
          draft.slotId,
          draft.performedMovementId,
          i + 1,
          validSets,
          draft.note.trim() || null
        );
      }
    },
    onSuccess: () => router.push("/"),
  });

  const isRunSplit = splitQuery.data?.name === "Run";
  const canFinish = cards.some((c) =>
    c.sets.some((s) => s.weight_kg !== "" && s.reps)
  );

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

      {templateQuery.isError && (
        <p className="text-sm text-red-400">
          Could not load workout template. Check your connection and try again.
        </p>
      )}

      {isRunSplit ? (
        <RunWorkoutForm splitId={splitId} />
      ) : (
        <>
          <div className="space-y-4">
            {cards.map((draft) => (
              <ExerciseCard
                key={draft.cardId}
                draft={draft}
                onChange={(updated) => updateCard(draft.cardId, updated)}
                onRemove={() => removeCard(draft.cardId)}
              />
            ))}

            {cards.length === 0 && cardsReady && (
              <p className="text-center text-sm text-zinc-500">
                No exercises yet. Add one below.
              </p>
            )}
          </div>

          {showPicker ? (
            <div className="mt-4">
              <MovementPicker
                movements={movementsQuery.data ?? []}
                onSelect={addCard}
                onClose={() => setShowPicker(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700 py-3 text-sm font-medium text-zinc-300 hover:border-brand hover:text-brand"
            >
              <Plus className="h-4 w-4" />
              Add exercise
            </button>
          )}

          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !canFinish}
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
