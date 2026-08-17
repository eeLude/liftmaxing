import { supabase } from "@/lib/supabase";
import type { QueryClient } from "@tanstack/react-query";
import type {
  HealthLog,
  Movement,
  PreviousExerciseData,
  SplitExercise,
  WorkoutCardDraft,
  WorkoutSession,
  WorkoutSplit,
} from "@/types/database";
import {
  calculateOneRepMax,
  formatProgressChange,
  getWeekStart,
  isCardioMuscle,
  pickBestSet,
  toDateString,
} from "@/lib/utils";
import { formatFiDate } from "@/lib/dates";
import {
  DASHBOARD_MUSCLE_GROUPS,
  emptyMuscleGroupProgress,
  getDashboardMuscleGroup,
  type DashboardMuscleGroup,
} from "@/lib/muscleGroups";

function agentLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
) {
  // #region agent log
  fetch("http://127.0.0.1:7340/ingest/9f294f2e-eeab-4153-a19e-324f3f26234a", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "8fe51b",
    },
    body: JSON.stringify({
      sessionId: "8fe51b",
      location,
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
    }),
  }).catch(() => {});
  // #endregion
}

export async function getSplits(): Promise<WorkoutSplit[]> {
  const { data, error } = await supabase
    .from("workout_splits")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getSplitById(id: string): Promise<WorkoutSplit | null> {
  const { data, error } = await supabase
    .from("workout_splits")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSplitTemplate(
  splitId: string
): Promise<SplitExercise[]> {
  const { data, error } = await supabase
    .from("split_exercises")
    .select("*, movements(*)")
    .eq("split_id", splitId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as SplitExercise[];
}

export async function getAllMovements(): Promise<Movement[]> {
  const { data, error } = await supabase
    .from("movements")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateMovement(
  name: string,
  targetMuscle: string
): Promise<Movement> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Movement name is required");
  if (!targetMuscle.trim()) throw new Error("Muscle group is required");

  const { data: existing, error: lookupError } = await supabase
    .from("movements")
    .select("*")
    .ilike("name", trimmed)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("movements")
    .insert({ name: trimmed, target_muscle: targetMuscle.trim() })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: raced, error: raceError } = await supabase
        .from("movements")
        .select("*")
        .ilike("name", trimmed)
        .maybeSingle();
      if (raceError) throw raceError;
      if (raced) return raced;
    }
    throw error;
  }

  return data;
}

export async function getMovementsWithHistory(): Promise<Movement[]> {
  const { data, error } = await supabase
    .from("workout_logs")
    .select("session_exercises(movement_id, movements(*))");

  if (error) throw error;

  const seen = new Map<string, Movement>();
  for (const row of data ?? []) {
    const se = row.session_exercises as {
      movement_id: string;
      movements: Movement;
    } | null;
    if (!se?.movements) continue;
    if (isCardioMuscle(se.movements.target_muscle)) continue;
    seen.set(se.movements.id, se.movements);
  }

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export type MovementProgressRow = {
  movementId: string;
  name: string;
  group: DashboardMuscleGroup;
  latestDate: string;
  latestSet: { weight_kg: number; reps: number };
  change: { label: string; direction: "up" | "down" | "neutral" } | null;
};

export type MuscleGroupProgress = Record<
  DashboardMuscleGroup,
  MovementProgressRow[]
>;

function isBetterSet(
  a: { weight_kg: number; reps: number },
  b: { weight_kg: number; reps: number }
): boolean {
  return a.weight_kg > b.weight_kg || (a.weight_kg === b.weight_kg && a.reps > b.reps);
}

async function getActiveLoggedMovementIds(): Promise<Set<string>> {
  const { data: sessions, error } = await supabase
    .from("workout_sessions")
    .select("id, split_id, date, created_at")
    .not("completed_at", "is", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!sessions?.length) return new Set();

  const latestSessionBySplit = new Map<string, string>();
  for (const session of sessions) {
    if (!latestSessionBySplit.has(session.split_id)) {
      latestSessionBySplit.set(session.split_id, session.id);
    }
  }

  const sessionIds = [...latestSessionBySplit.values()];
  if (sessionIds.length === 0) return new Set();

  const { data: exercises, error: exError } = await supabase
    .from("session_exercises")
    .select("movement_id, workout_logs(id)")
    .in("session_id", sessionIds);

  if (exError) throw exError;

  const ids = new Set<string>();
  for (const row of exercises ?? []) {
    const logs = row.workout_logs as { id: string }[] | null;
    if (logs && logs.length > 0) {
      ids.add(row.movement_id);
    }
  }

  return ids;
}

export async function getMuscleGroupProgress(): Promise<MuscleGroupProgress> {
  const activeIds = await getActiveLoggedMovementIds();

  const { data, error } = await supabase
    .from("session_exercises")
    .select(
      "movement_id, movements(id, name, target_muscle), workout_sessions!inner(date), workout_logs(weight_kg, reps)"
    );

  if (error) throw error;

  type MovementAcc = {
    movementId: string;
    name: string;
    targetMuscle: string;
    sessionsByDate: Map<string, { weight_kg: number; reps: number }>;
  };

  const byMovement = new Map<string, MovementAcc>();

  for (const row of data ?? []) {
    const movement = row.movements as {
      id: string;
      name: string;
      target_muscle: string;
    } | null;
    if (!movement || isCardioMuscle(movement.target_muscle)) continue;

    const date = (row.workout_sessions as { date: string }).date;
    const logs = (row.workout_logs as { weight_kg: number; reps: number }[]) ?? [];
    const sets = logs.map((l) => ({
      weight_kg: Number(l.weight_kg),
      reps: l.reps,
    }));
    const bestSet = pickBestSet(sets);
    if (!bestSet) continue;

    let acc = byMovement.get(movement.id);
    if (!acc) {
      acc = {
        movementId: movement.id,
        name: movement.name,
        targetMuscle: movement.target_muscle,
        sessionsByDate: new Map(),
      };
      byMovement.set(movement.id, acc);
    }

    const existing = acc.sessionsByDate.get(date);
    if (!existing || isBetterSet(bestSet, existing)) {
      acc.sessionsByDate.set(date, bestSet);
    }
  }

  const result = emptyMuscleGroupProgress() as MuscleGroupProgress;

  for (const acc of byMovement.values()) {
    if (activeIds.size > 0 && !activeIds.has(acc.movementId)) continue;

    const group = getDashboardMuscleGroup(acc.targetMuscle);
    if (!group) continue;

    const sessions = [...acc.sessionsByDate.entries()].sort(([a], [b]) =>
      b.localeCompare(a)
    );
    if (sessions.length === 0) continue;

    const [latestDate, latestSet] = sessions[0];
    const previous = sessions[1]?.[1] ?? null;
    const change = previous ? formatProgressChange(latestSet, previous) : null;

    result[group].push({
      movementId: acc.movementId,
      name: acc.name,
      group,
      latestDate,
      latestSet,
      change,
    });
  }

  for (const group of DASHBOARD_MUSCLE_GROUPS) {
    result[group].sort((a, b) => {
      const dateCmp = b.latestDate.localeCompare(a.latestDate);
      if (dateCmp !== 0) return dateCmp;
      return a.name.localeCompare(b.name);
    });
  }

  return result;
}

export type WeeklyTrainingVolume = {
  week: string;
  weekLabel: string;
  sets: number;
  sessions: number;
};

export async function getWeeklyTrainingVolume(
  weeks = 12
): Promise<WeeklyTrainingVolume[]> {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const { data: sessions, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, date")
    .gte("date", toDateString(since))
    .order("date");

  if (sessionError) throw sessionError;
  if (!sessions?.length) return [];

  const sessionIds = sessions.map((s) => s.id);
  const sessionsByWeek = new Map<string, Set<string>>();

  for (const s of sessions) {
    const week = toDateString(getWeekStart(new Date(s.date + "T12:00:00")));
    if (!sessionsByWeek.has(week)) sessionsByWeek.set(week, new Set());
    sessionsByWeek.get(week)!.add(s.id);
  }

  const { data: sessionExercises, error: seError } = await supabase
    .from("session_exercises")
    .select("id, session_id, workout_logs(id)")
    .in("session_id", sessionIds);

  if (seError) throw seError;

  const setsByWeek = new Map<string, number>();
  for (const se of sessionExercises ?? []) {
    const logs = se.workout_logs as { id: string }[] | null;
    if (!logs?.length) continue;
    const session = sessions.find((s) => s.id === se.session_id);
    if (!session) continue;
    const week = toDateString(getWeekStart(new Date(session.date + "T12:00:00")));
    setsByWeek.set(week, (setsByWeek.get(week) ?? 0) + logs.length);
  }

  return Array.from(sessionsByWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, sessionSet]) => ({
      week,
      weekLabel: formatFiDate(week),
      sets: setsByWeek.get(week) ?? 0,
      sessions: sessionSet.size,
    }));
}

export async function getPreviousMovementPerformance(
  movementId: string
): Promise<PreviousExerciseData | null> {
  const { data: sessionExercises, error: seError } = await supabase
    .from("session_exercises")
    .select("id, note, workout_sessions!inner(date)")
    .eq("movement_id", movementId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (seError) throw seError;
  if (!sessionExercises?.length) return null;

  const last = sessionExercises[0];
  const sessionDate =
    (last.workout_sessions as { date: string }).date ?? "";

  const { data: logs, error: logError } = await supabase
    .from("workout_logs")
    .select("set_number, weight_kg, reps")
    .eq("session_exercise_id", last.id)
    .order("set_number");

  if (logError) throw logError;
  if (!logs?.length) return null;

  return {
    sets: logs.map((l) => ({
      set_number: l.set_number,
      weight_kg: Number(l.weight_kg),
      reps: l.reps,
    })),
    note: last.note,
    sessionDate,
  };
}

export async function createWorkoutSession(
  splitId: string,
  date: string = toDateString(new Date())
): Promise<WorkoutSession> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      split_id: splitId,
      date,
      is_seeded: false,
      user_id: user.id,
      completed_at: null,
    })
    .select()
    .single();
  if (error) {
    agentLog(
      "queries.ts:createWorkoutSession",
      "insert failed",
      { splitId, date, error: error.message, code: error.code },
      "F"
    );
    throw error;
  }
  agentLog(
    "queries.ts:createWorkoutSession",
    "created session",
    { sessionId: data.id, splitId, date },
    "F"
  );
  return data;
}

export async function getInProgressSession(
  splitId: string,
  date: string = toDateString(new Date())
): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("split_id", splitId)
    .eq("date", date)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type WorkoutSessionWithSplit = WorkoutSession & { splitName: string };

export async function getWorkoutSessionForDate(
  date: string
): Promise<WorkoutSessionWithSplit | null> {
  const { count, error: countError } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("date", date);

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*, workout_splits(name)")
    .eq("date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  agentLog(
    "queries.ts:getWorkoutSessionForDate",
    "session lookup",
    {
      date,
      sessionCount: countError ? null : count,
      returnedSessionId: data?.id ?? null,
      returnedSplitId: data?.split_id ?? null,
      completedAt: data?.completed_at ?? null,
    },
    "F"
  );

  if (!data) return null;
  const { workout_splits, ...session } = data as WorkoutSession & {
    workout_splits: { name: string };
  };
  return {
    ...session,
    splitName: workout_splits.name,
  };
}

export async function loadSessionCards(
  sessionId: string
): Promise<WorkoutCardDraft[]> {
  const { data, error } = await supabase
    .from("session_exercises")
    .select(
      "id, template_slot_id, movement_id, sort_order, note, movements(name, target_muscle), workout_logs(weight_kg, reps, set_number)"
    )
    .eq("session_id", sessionId)
    .order("sort_order");

  if (error) throw error;

  return (data ?? []).map((row) => {
    const movement = row.movements as { name: string; target_muscle: string };
    const logs = (row.workout_logs as {
      weight_kg: number;
      reps: number;
      set_number: number;
    }[])
      .sort((a, b) => a.set_number - b.set_number)
      .map((l) => ({
        weight_kg: String(l.weight_kg),
        reps: String(l.reps),
      }));

    const slotId = row.template_slot_id as string | null;
    return {
      cardId: slotId ?? row.id,
      slotId,
      sessionExerciseId: row.id,
      performedMovementId: row.movement_id,
      performedName: movement.name,
      targetMuscle: movement.target_muscle,
      sets: logs.length > 0 ? logs : [{ weight_kg: "", reps: "" }],
      note: row.note ?? "",
    };
  });
}

export async function getLastCompletedSessionCards(
  splitId: string
): Promise<WorkoutCardDraft[]> {
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("split_id", splitId)
    .not("completed_at", "is", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) return [];

  const saved = await loadSessionCards(session.id);
  if (saved.length === 0) return [];

  const template = await getSplitTemplate(splitId);
  const defaultSetsBySlot = new Map(
    template.map((slot) => [slot.id, slot.default_sets])
  );

  return saved.map((card) => {
    const setCount = card.slotId ? defaultSetsBySlot.get(card.slotId) ?? 3 : 3;
    const sets = Array.from({ length: Math.max(setCount, 1) }, () => ({
      weight_kg: "",
      reps: "",
    }));

    return {
      cardId: card.slotId ?? crypto.randomUUID(),
      slotId: card.slotId,
      sessionExerciseId: undefined,
      performedMovementId: card.performedMovementId,
      performedName: card.performedName,
      targetMuscle: card.targetMuscle,
      sets,
      note: "",
    };
  });
}

export async function persistCardOrder(
  sessionId: string,
  cards: WorkoutCardDraft[]
): Promise<WorkoutCardDraft[]> {
  const updated: WorkoutCardDraft[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const sortOrder = i + 1;
    let sessionExerciseId = card.sessionExerciseId ?? null;

    if (sessionExerciseId) {
      const { error } = await supabase
        .from("session_exercises")
        .update({ sort_order: sortOrder })
        .eq("id", sessionExerciseId);
      if (error) throw error;
      updated.push(card);
      continue;
    }

    if (card.slotId) {
      const { data: existing, error: lookupError } = await supabase
        .from("session_exercises")
        .select("id")
        .eq("session_id", sessionId)
        .eq("template_slot_id", card.slotId)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existing) {
        const { error: updateError } = await supabase
          .from("session_exercises")
          .update({ sort_order: sortOrder, movement_id: card.performedMovementId })
          .eq("id", existing.id);
        if (updateError) throw updateError;
        updated.push({ ...card, sessionExerciseId: existing.id });
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("session_exercises")
        .insert({
          session_id: sessionId,
          template_slot_id: card.slotId,
          movement_id: card.performedMovementId,
          sort_order: sortOrder,
          note: card.note.trim() || null,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      updated.push({ ...card, sessionExerciseId: inserted.id });
      continue;
    }

    updated.push(card);
  }

  return updated;
}

function parseValidSets(draft: WorkoutCardDraft) {
  return draft.sets
    .filter((s) => s.weight_kg !== "" && s.reps !== "")
    .map((s) => ({
      weight_kg: parseFloat(s.weight_kg),
      reps: parseInt(s.reps, 10),
    }))
    .filter((s) => !Number.isNaN(s.weight_kg) && !Number.isNaN(s.reps));
}

export async function upsertSessionExercise(
  sessionId: string,
  draft: WorkoutCardDraft,
  sortOrder: number
): Promise<string | null> {
  const validSets = parseValidSets(draft);
  if (validSets.length === 0) return draft.sessionExerciseId ?? null;

  const note = draft.note.trim() || null;
  let sessionExerciseId = draft.sessionExerciseId ?? null;

  if (!sessionExerciseId && draft.slotId) {
    const { data: existing, error: lookupError } = await supabase
      .from("session_exercises")
      .select("id")
      .eq("session_id", sessionId)
      .eq("template_slot_id", draft.slotId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    sessionExerciseId = existing?.id ?? null;
  }

  if (!sessionExerciseId && !draft.slotId) {
    const { data: byCardId, error: byCardError } = await supabase
      .from("session_exercises")
      .select("id")
      .eq("session_id", sessionId)
      .eq("id", draft.cardId)
      .maybeSingle();
    if (byCardError) throw byCardError;
    sessionExerciseId = byCardId?.id ?? null;

    if (!sessionExerciseId) {
      const { data: customMatches, error: customError } = await supabase
        .from("session_exercises")
        .select("id")
        .eq("session_id", sessionId)
        .eq("movement_id", draft.performedMovementId)
        .is("template_slot_id", null);
      if (customError) throw customError;
      if (customMatches?.length === 1) {
        sessionExerciseId = customMatches[0].id;
      }
    }
  }

  if (sessionExerciseId) {
    const { data: existingRow, error: existingError } = await supabase
      .from("session_exercises")
      .select("id")
      .eq("id", sessionExerciseId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existingRow) {
      sessionExerciseId = null;
    }
  }

  if (sessionExerciseId) {
    const { error: updateError } = await supabase
      .from("session_exercises")
      .update({ note, sort_order: sortOrder, movement_id: draft.performedMovementId })
      .eq("id", sessionExerciseId);
    if (updateError) throw updateError;

    const { error: deleteError } = await supabase
      .from("workout_logs")
      .delete()
      .eq("session_exercise_id", sessionExerciseId);
    if (deleteError) throw deleteError;

    const rows = validSets.map((set, index) => ({
      session_exercise_id: sessionExerciseId!,
      set_number: index + 1,
      weight_kg: set.weight_kg,
      reps: set.reps,
    }));
    const { error: insertError } = await supabase.from("workout_logs").insert(rows);
    if (insertError) {
      if (insertError.code === "23503") {
        return upsertSessionExercise(
          sessionId,
          { ...draft, sessionExerciseId: undefined },
          sortOrder
        );
      }
      throw insertError;
    }
    return sessionExerciseId;
  }

  const { data: sessionExercise, error: seError } = await supabase
    .from("session_exercises")
    .insert({
      session_id: sessionId,
      template_slot_id: draft.slotId ?? null,
      movement_id: draft.performedMovementId,
      sort_order: sortOrder,
      note,
    })
    .select()
    .single();
  if (seError) {
    if (seError.code === "23502" && !draft.slotId) {
      throw new Error(
        "Could not save extra exercise. Run supabase/migrate-workout-cards.sql in Supabase."
      );
    }
    if (seError.code === "23505" && draft.slotId) {
      const { data: raced, error: raceError } = await supabase
        .from("session_exercises")
        .select("id")
        .eq("session_id", sessionId)
        .eq("template_slot_id", draft.slotId)
        .maybeSingle();
      if (raceError) throw raceError;
      if (raced) {
        return upsertSessionExercise(
          sessionId,
          { ...draft, sessionExerciseId: raced.id },
          sortOrder
        );
      }
    }
    throw seError;
  }

  const rows = validSets.map((set, index) => ({
    session_exercise_id: sessionExercise.id,
    set_number: index + 1,
    weight_kg: set.weight_kg,
    reps: set.reps,
  }));
  const { error: logError } = await supabase.from("workout_logs").insert(rows);
  if (logError) throw logError;
  return sessionExercise.id;
}

export async function deleteSessionExercise(sessionExerciseId: string) {
  const { error } = await supabase
    .from("session_exercises")
    .delete()
    .eq("id", sessionExerciseId);
  if (error) throw error;
}

export async function isWorkoutSessionCompleted(
  sessionId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("completed_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data?.completed_at != null;
}

export async function completeWorkoutSession(sessionId: string) {
  const { data: existing, error: readError } = await supabase
    .from("workout_sessions")
    .select("completed_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.completed_at) return;

  const { error } = await supabase
    .from("workout_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) {
    agentLog(
      "queries.ts:completeWorkoutSession",
      "update failed",
      { sessionId, error: error.message, code: error.code },
      "A"
    );
    if (error.code === "42703") {
      throw new Error(
        "Could not finish workout. Run supabase/migrate-autosave.sql in Supabase."
      );
    }
    throw error;
  }
}

export async function deleteWorkoutSession(sessionId: string) {
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) throw error;
}

export async function invalidateWorkoutDashboardQueries(
  queryClient: QueryClient
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["workout-days"] }),
    queryClient.invalidateQueries({ queryKey: ["workout-days-range"] }),
    queryClient.invalidateQueries({ queryKey: ["workout-session-for-date"] }),
    queryClient.invalidateQueries({ queryKey: ["weekly-volume"] }),
    queryClient.invalidateQueries({ queryKey: ["weekly-training-volume"] }),
    queryClient.invalidateQueries({ queryKey: ["muscle-group-progress"] }),
  ]);
}

export async function abandonInProgressSession(
  splitId: string,
  date: string = toDateString(new Date())
) {
  const session = await getInProgressSession(splitId, date);
  if (!session) return;
  await completeWorkoutSession(session.id);
}

export type MovementProgressPoint = {
  date: string;
  dateLabel: string;
  topWeight: number;
  estimated1RM: number;
  topSet: { weight_kg: number; reps: number };
};

export async function getMovementProgress(
  movementId: string
): Promise<MovementProgressPoint[]> {
  const { data: sessionExercises, error: seError } = await supabase
    .from("session_exercises")
    .select("id, workout_sessions!inner(date)")
    .eq("movement_id", movementId);

  if (seError) throw seError;
  if (!sessionExercises?.length) return [];

  const seIds = sessionExercises.map((se) => se.id);
  const dateBySe = new Map(
    sessionExercises.map((se) => [
      se.id,
      (se.workout_sessions as { date: string }).date,
    ])
  );

  const { data: logs, error: logError } = await supabase
    .from("workout_logs")
    .select("session_exercise_id, weight_kg, reps")
    .in("session_exercise_id", seIds);

  if (logError) throw logError;
  if (!logs?.length) return [];

  const byDate = new Map<
    string,
    { topWeight: number; best1RM: number; topSet: { weight_kg: number; reps: number } }
  >();

  for (const row of logs) {
    const date = dateBySe.get(row.session_exercise_id);
    if (!date) continue;
    const weight = Number(row.weight_kg);
    const reps = row.reps;
    const oneRM = calculateOneRepMax(weight, reps);
    const existing = byDate.get(date) ?? {
      topWeight: 0,
      best1RM: 0,
      topSet: { weight_kg: 0, reps: 0 },
    };

    if (oneRM > existing.best1RM) {
      byDate.set(date, {
        topWeight: weight,
        best1RM: oneRM,
        topSet: { weight_kg: weight, reps },
      });
    } else {
      byDate.set(date, existing);
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      dateLabel: formatFiDate(date),
      topWeight: vals.topWeight,
      estimated1RM: vals.best1RM,
      topSet: vals.topSet,
    }));
}

export type MuscleVolume = {
  muscle: string;
  sets: number;
};

export async function getWeeklyMuscleVolume(): Promise<MuscleVolume[]> {
  const weekStartStr = toDateString(getWeekStart(new Date()));

  const { data: sessions, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id")
    .gte("date", weekStartStr);

  if (sessionError) throw sessionError;
  if (!sessions?.length) return [];

  const sessionIds = sessions.map((s) => s.id);

  const { data, error } = await supabase
    .from("session_exercises")
    .select("id, movements(target_muscle), workout_logs(id)")
    .in("session_id", sessionIds);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const logs = row.workout_logs as { id: string }[] | null;
    if (!logs?.length) continue;
    const muscle = (row.movements as { target_muscle: string }).target_muscle;
    counts.set(muscle, (counts.get(muscle) ?? 0) + logs.length);
  }

  return Array.from(counts.entries())
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets);
}

export type WorkoutDay = {
  date: string;
  sessionId: string;
  splitId: string;
  splitName: string;
  isComplete: boolean;
};

function mapWorkoutSessionRows(
  rows: {
    id: string;
    date: string;
    split_id: string;
    completed_at: string | null;
    workout_splits: { name: string };
  }[]
): WorkoutDay[] {
  const byDate = new Map<string, WorkoutDay>();
  for (const row of rows) {
    if (byDate.has(row.date)) continue;
    byDate.set(row.date, {
      date: row.date,
      sessionId: row.id,
      splitId: row.split_id,
      splitName: row.workout_splits.name,
      isComplete: row.completed_at != null,
    });
  }
  return Array.from(byDate.values());
}

export async function getWorkoutDaysInRange(
  start: string,
  end: string
): Promise<WorkoutDay[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, date, split_id, completed_at, workout_splits(name)")
    .gte("date", start)
    .lte("date", end)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return mapWorkoutSessionRows(
    (data ?? []) as {
      id: string;
      date: string;
      split_id: string;
      completed_at: string | null;
      workout_splits: { name: string };
    }[]
  );
}

export async function getWorkoutDaysInMonth(
  year: number,
  month: number
): Promise<WorkoutDay[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return getWorkoutDaysInRange(start, end);
}

export async function getHealthLogs(days = 120): Promise<HealthLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("health_logs")
    .select("*")
    .gte("date", toDateString(since))
    .order("date");

  if (error) throw error;
  return data ?? [];
}

export async function upsertHealthLog(
  date: string,
  weight_kg: number | null,
  calories: number | null
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("health_logs")
    .upsert(
      { date, weight_kg, calories, user_id: user.id },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTodayHealthLog(): Promise<HealthLog | null> {
  const today = toDateString(new Date());
  const { data, error } = await supabase
    .from("health_logs")
    .select("*")
    .eq("date", today)
    .maybeSingle();
  if (error) throw error;
  return data;
}
