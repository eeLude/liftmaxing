import { supabase } from "@/lib/supabase";
import type {
  HealthLog,
  Movement,
  PreviousExerciseData,
  SplitExercise,
  WorkoutCardDraft,
  WorkoutSession,
  WorkoutSplit,
} from "@/types/database";
import { calculateOneRepMax, formatSetLine, getWeekStart, toDateString, formatCardioSetLine, isCardioMuscle } from "@/lib/utils";
import { formatFiDate } from "@/lib/dates";

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
    seen.set(se.movements.id, se.movements);
  }

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
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

export async function findOrCreateMovement(
  name: string,
  targetMuscle: string
): Promise<Movement> {
  const trimmed = name.trim();
  const { data: existing } = await supabase
    .from("movements")
    .select("*")
    .eq("name", trimmed)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("movements")
    .insert({ name: trimmed, target_muscle: targetMuscle })
    .select()
    .single();
  if (error) throw error;
  return data;
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

export async function createWorkoutSession(splitId: string): Promise<WorkoutSession> {
  const today = toDateString(new Date());
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
      date: today,
      is_seeded: false,
      user_id: user.id,
      completed_at: null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveSessionExercise(
  sessionId: string,
  templateSlotId: string | null,
  movementId: string,
  sortOrder: number,
  sets: { weight_kg: number; reps: number }[],
  note: string | null
) {
  const { data: sessionExercise, error: seError } = await supabase
    .from("session_exercises")
    .insert({
      session_id: sessionId,
      template_slot_id: templateSlotId,
      movement_id: movementId,
      sort_order: sortOrder,
      note,
    })
    .select()
    .single();

  if (seError) throw seError;

  const rows = sets.map((set, index) => ({
    session_exercise_id: sessionExercise.id,
    set_number: index + 1,
    weight_kg: set.weight_kg,
    reps: set.reps,
  }));

  const { error } = await supabase.from("workout_logs").insert(rows);
  if (error) throw error;
}

export async function getInProgressSession(
  splitId: string
): Promise<WorkoutSession | null> {
  const today = toDateString(new Date());
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("split_id", splitId)
    .eq("date", today)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
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

  if (draft.sessionExerciseId) {
    const { error: updateError } = await supabase
      .from("session_exercises")
      .update({ note, sort_order: sortOrder, movement_id: draft.performedMovementId })
      .eq("id", draft.sessionExerciseId);
    if (updateError) throw updateError;

    const { error: deleteError } = await supabase
      .from("workout_logs")
      .delete()
      .eq("session_exercise_id", draft.sessionExerciseId);
    if (deleteError) throw deleteError;

    const rows = validSets.map((set, index) => ({
      session_exercise_id: draft.sessionExerciseId!,
      set_number: index + 1,
      weight_kg: set.weight_kg,
      reps: set.reps,
    }));
    const { error: insertError } = await supabase.from("workout_logs").insert(rows);
    if (insertError) throw insertError;
    return draft.sessionExerciseId;
  }

  const { data: sessionExercise, error: seError } = await supabase
    .from("session_exercises")
    .insert({
      session_id: sessionId,
      template_slot_id: draft.slotId,
      movement_id: draft.performedMovementId,
      sort_order: sortOrder,
      note,
    })
    .select()
    .single();
  if (seError) throw seError;

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

export async function completeWorkoutSession(sessionId: string) {
  const { error } = await supabase
    .from("workout_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function abandonInProgressSession(splitId: string) {
  const session = await getInProgressSession(splitId);
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

    const isBetter =
      weight > existing.topWeight ||
      (weight === existing.topWeight && reps > existing.topSet.reps);

    byDate.set(date, {
      topWeight: Math.max(existing.topWeight, weight),
      best1RM: Math.max(existing.best1RM, oneRM),
      topSet: isBetter ? { weight_kg: weight, reps } : existing.topSet,
    });
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
  splitName: string;
};

export async function getWorkoutDaysInMonth(
  year: number,
  month: number
): Promise<WorkoutDay[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, date, workout_splits(name)")
    .gte("date", start)
    .lte("date", end)
    .order("date");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    date: row.date,
    sessionId: row.id,
    splitName: (row.workout_splits as { name: string }).name,
  }));
}

export type SessionSummaryExercise = {
  name: string;
  setsSummary: string;
  note: string | null;
};

export type WorkoutSessionSummary = {
  date: string;
  splitName: string;
  exercises: SessionSummaryExercise[];
};

export async function getWorkoutSessionSummary(
  sessionId: string
): Promise<WorkoutSessionSummary | null> {
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("date, workout_splits(name)")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) return null;

  const { data: exercises, error: exError } = await supabase
    .from("session_exercises")
    .select(
      "note, sort_order, movements(name, target_muscle), workout_logs(weight_kg, reps, set_number)"
    )
    .eq("session_id", sessionId)
    .order("sort_order");

  if (exError) throw exError;

  return {
    date: session.date,
    splitName: (session.workout_splits as { name: string }).name,
    exercises: (exercises ?? []).map((ex) => {
      const movement = ex.movements as { name: string; target_muscle: string };
      const logs = (ex.workout_logs as { weight_kg: number; reps: number; set_number: number }[])
        .sort((a, b) => a.set_number - b.set_number);
      const setsSummary = isCardioMuscle(movement.target_muscle)
        ? logs
            .map((l) => formatCardioSetLine(Number(l.weight_kg), l.reps))
            .join(", ")
        : logs
            .map((l) => formatSetLine(Number(l.weight_kg), l.reps))
            .join(", ");
      return {
        name: movement.name,
        setsSummary,
        note: ex.note,
      };
    }),
  };
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
