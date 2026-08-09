"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  createWorkoutSession,
  getAllMovements,
  getPreviousMovementPerformance,
  getSplitTemplate,
  saveSessionExercise,
} from "@/lib/queries";
import { formatFiDate } from "@/lib/dates";
import { formatCardioSetLine, formatPreviousSets } from "@/lib/utils";

const RUN_MOVEMENTS = ["Treadmill Run", "Outdoor Run"];

function buildRunNote(
  speed: string,
  elevation: string,
  movementName: string,
  userNote: string
): string | null {
  const parts: string[] = [];
  if (speed.trim()) parts.push(`${speed.trim()} kph`);
  if (elevation.trim()) parts.push(`${elevation.trim()}% elevation`);

  let auto = "";
  if (parts.length) {
    const prefix = movementName.includes("Treadmill") ? "Treadmill" : "Run";
    auto = `${prefix} — ${parts.join(" @ ")}`;
  }

  const trimmed = userNote.trim();
  if (trimmed && auto) return `${auto}. ${trimmed}`;
  return trimmed || auto || null;
}

export function RunWorkoutForm({ splitId }: { splitId: string }) {
  const router = useRouter();

  const templateQuery = useQuery({
    queryKey: ["split-template", splitId],
    queryFn: () => getSplitTemplate(splitId),
  });

  const movementsQuery = useQuery({
    queryKey: ["movements"],
    queryFn: getAllMovements,
  });

  const runMovements =
    movementsQuery.data?.filter((m) => RUN_MOVEMENTS.includes(m.name)) ?? [];

  const [movementId, setMovementId] = useState<string>("");
  const selectedMovementId = movementId || runMovements[0]?.id || "";
  const selectedMovement =
    runMovements.find((m) => m.id === selectedMovementId) ?? runMovements[0];

  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [speed, setSpeed] = useState("");
  const [elevation, setElevation] = useState("");
  const [note, setNote] = useState("");

  const { data: previous, isLoading: previousLoading } = useQuery({
    queryKey: ["previous-performance", selectedMovementId],
    queryFn: () => getPreviousMovementPerformance(selectedMovementId),
    enabled: !!selectedMovementId,
  });

  const copyLastSession = () => {
    if (!previous?.sets.length) return;
    const last = previous.sets[0];
    setDuration(String(last.reps));
    setDistance(last.weight_kg > 0 ? String(last.weight_kg) : "");
    setNote(previous.note ?? "");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const durationMin = parseInt(duration, 10);
      if (!durationMin || durationMin <= 0) {
        throw new Error("Duration required");
      }

      const slot = templateQuery.data?.[0];
      const movement = selectedMovement;
      if (!slot || !movement) throw new Error("Run template not found");

      const distanceKm = distance.trim() ? parseFloat(distance) : 0;
      const session = await createWorkoutSession(splitId);
      const runNote = buildRunNote(
        speed,
        elevation,
        movement.name,
        note
      );

      await saveSessionExercise(
        session.id,
        slot.id,
        movement.id,
        1,
        [{ weight_kg: distanceKm, reps: durationMin }],
        runNote
      );
    },
    onSuccess: () => router.push("/"),
  });

  const canSave = duration.trim() !== "" && parseInt(duration, 10) > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <label className="mb-2 block text-sm font-medium text-zinc-400">
          Run type
        </label>
        <select
          value={selectedMovementId}
          onChange={(e) => setMovementId(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-base"
        >
          {runMovements.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="text-sm text-zinc-500">
            {previousLoading ? (
              <p>Loading previous...</p>
            ) : previous ? (
              <>
                <p>
                  Last time ({formatFiDate(previous.sessionDate)}):{" "}
                  {formatPreviousSets(previous.sets, "Cardio")}
                </p>
                {previous.note && (
                  <p className="italic">&ldquo;{previous.note}&rdquo;</p>
                )}
              </>
            ) : (
              <p>No previous run logged</p>
            )}
          </div>
          <button
            type="button"
            onClick={copyLastSession}
            disabled={!previous?.sets.length}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Last
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Duration (min)
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-center text-base"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Distance (km)
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="3.5"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-center text-base"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Speed (kph)
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="5.3"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-center text-base"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Elevation (%)
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="3.8"
              value={elevation}
              onChange={(e) => setElevation(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-center text-base"
            />
          </div>
        </div>

        <input
          type="text"
          placeholder="Notes (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        />

        {duration && distance && (
          <p className="mt-3 text-sm text-zinc-500">
            Summary:{" "}
            {formatCardioSetLine(parseFloat(distance) || 0, parseInt(duration, 10))}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !canSave}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-lg font-semibold text-white shadow-lg shadow-brand/30 disabled:opacity-60"
      >
        <Check className="h-5 w-5" />
        {saveMutation.isPending ? "Saving..." : "Finish Run"}
      </button>

      {saveMutation.isError && (
        <p className="text-center text-sm text-red-500">
          Failed to save. Check your connection.
        </p>
      )}
    </div>
  );
}
