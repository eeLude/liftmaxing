"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  abandonInProgressSession,
  completeWorkoutSession,
  createWorkoutSession,
  deleteSessionExercise,
  deleteWorkoutSession,
  getLastCompletedSessionCards,
  getWorkoutSessionForDate,
  isWorkoutSessionCompleted,
  loadSessionCards,
  persistCardOrder,
  upsertSessionExercise,
} from "@/lib/queries";
import type { WorkoutCardDraft } from "@/types/database";

const DEBOUNCE_MS = 1500;
const DRAFT_PREFIX = "liftmaxxing:draft:";

function agentLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
) {
  const entry = {
    sessionId: "8fe51b",
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
  };
  // #region agent log
  fetch("http://127.0.0.1:7340/ingest/9f294f2e-eeab-4153-a19e-324f3f26234a", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "8fe51b",
    },
    body: JSON.stringify(entry),
  }).catch(() => {});
  try {
    const prev = JSON.parse(
      localStorage.getItem("liftmaxxing:debug-8fe51b") ?? "[]"
    ) as unknown[];
    prev.push(entry);
    localStorage.setItem(
      "liftmaxxing:debug-8fe51b",
      JSON.stringify(prev.slice(-20))
    );
  } catch {
    /* ignore quota errors */
  }
  // #endregion
}

function formatUnknownError(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const parts: string[] = [];
    if (typeof o.message === "string" && o.message) parts.push(o.message);
    if (typeof o.code === "string" && o.code) parts.push(`code=${o.code}`);
    if (typeof o.details === "string" && o.details) parts.push(o.details);
    if (typeof o.hint === "string" && o.hint) parts.push(o.hint);
    if (parts.length > 0) return parts.join(" · ");
    try {
      return JSON.stringify(err);
    } catch {
      return "[unserializable error]";
    }
  }
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type DraftPayload = {
  cards: WorkoutCardDraft[];
  updatedAt: number;
};

function draftKey(sessionId: string) {
  return `${DRAFT_PREFIX}${sessionId}`;
}

function readDraft(sessionId: string): DraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload;
  } catch {
    return null;
  }
}

function writeDraft(sessionId: string, cards: WorkoutCardDraft[]) {
  if (typeof window === "undefined") return;
  const payload: DraftPayload = { cards, updatedAt: Date.now() };
  localStorage.setItem(draftKey(sessionId), JSON.stringify(payload));
}

function clearDraft(sessionId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(draftKey(sessionId));
}

function mergeCards(
  dbCards: WorkoutCardDraft[],
  draftCards: WorkoutCardDraft[]
): WorkoutCardDraft[] {
  if (draftCards.length === 0) return dbCards;
  if (dbCards.length === 0) return draftCards;

  const dbById = new Map(dbCards.map((c) => [c.cardId, c]));
  const merged: WorkoutCardDraft[] = [];

  for (const draft of draftCards) {
    const existing = dbById.get(draft.cardId);
    if (existing) {
      merged.push({ ...existing, ...draft, sessionExerciseId: existing.sessionExerciseId ?? draft.sessionExerciseId });
      dbById.delete(draft.cardId);
    } else {
      merged.push(draft);
    }
  }

  for (const remaining of dbById.values()) {
    merged.push(remaining);
  }

  return merged;
}

function cardHasValidSet(card: WorkoutCardDraft) {
  return card.sets.some((s) => s.weight_kg !== "" && s.reps !== "");
}

type UseActiveWorkoutOptions = {
  splitId: string;
  workoutDate: string;
  buildInitialCards: () => WorkoutCardDraft[];
  templateReady: boolean;
};

export function useActiveWorkout({
  splitId,
  workoutDate,
  buildInitialCards,
  templateReady,
}: UseActiveWorkoutOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cards, setCards] = useState<WorkoutCardDraft[]>([]);
  const [cardsReady, setCardsReady] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hasPendingSave, setHasPendingSave] = useState(false);

  const cardsRef = useRef(cards);
  const sessionIdRef = useRef(sessionId);
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingCards = useRef<Set<string>>(new Set());
  const saveStatusRef = useRef(saveStatus);
  const initStarted = useRef(false);
  const initKey = useRef("");

  cardsRef.current = cards;
  sessionIdRef.current = sessionId;
  saveStatusRef.current = saveStatus;

  const updatePendingState = useCallback(() => {
    setHasPendingSave(pendingCards.current.size > 0);
  }, []);

  const saveCard = useCallback(
    async (cardId: string) => {
      const sid = sessionIdRef.current;
      if (!sid) return;

      const card = cardsRef.current.find((c) => c.cardId === cardId);
      if (!card) return;

      const index = cardsRef.current.findIndex((c) => c.cardId === cardId);
      if (index < 0) return;

      if (!cardHasValidSet(card)) {
        pendingCards.current.delete(cardId);
        updatePendingState();
        return;
      }

      setSaveStatus("saving");
      try {
        const sessionExerciseId = await upsertSessionExercise(sid, card, index + 1);
        setCards((prev) => {
          const next = prev.map((c) =>
            c.cardId === cardId ? { ...c, sessionExerciseId } : c
          );
          cardsRef.current = next;
          return next;
        });
        pendingCards.current.delete(cardId);
        updatePendingState();
        setSaveStatus("saved");
      } catch {
        pendingCards.current.delete(cardId);
        updatePendingState();
        setSaveStatus("error");
      }
    },
    [updatePendingState]
  );

  const scheduleCardSave = useCallback(
    (cardId: string) => {
      const sid = sessionIdRef.current;
      if (!sid) return;

      writeDraft(sid, cardsRef.current);

      const existing = debounceTimers.current.get(cardId);
      if (existing) clearTimeout(existing);

      pendingCards.current.add(cardId);
      updatePendingState();

      const timer = setTimeout(() => {
        debounceTimers.current.delete(cardId);
        void saveCard(cardId);
      }, DEBOUNCE_MS);
      debounceTimers.current.set(cardId, timer);
    },
    [saveCard, updatePendingState]
  );

  const retryFailedSaves = useCallback(() => {
    for (const card of cardsRef.current) {
      if (cardHasValidSet(card)) {
        pendingCards.current.add(card.cardId);
        void saveCard(card.cardId);
      }
    }
    updatePendingState();
  }, [saveCard, updatePendingState]);

  const flushSaves = useCallback(async () => {
    for (const timer of debounceTimers.current.values()) {
      clearTimeout(timer);
    }
    debounceTimers.current.clear();
    pendingCards.current.clear();
    updatePendingState();

    const sid = sessionIdRef.current;
    if (!sid) return;

    for (const card of [...cardsRef.current]) {
      if (!cardHasValidSet(card)) continue;

      const index = cardsRef.current.findIndex((c) => c.cardId === card.cardId);
      const current = cardsRef.current[index];
      if (!current) continue;

      try {
        const sessionExerciseId = await upsertSessionExercise(
          sid,
          current,
          index + 1
        );
        if (sessionExerciseId) {
          cardsRef.current = cardsRef.current.map((c) =>
            c.cardId === card.cardId ? { ...c, sessionExerciseId } : c
          );
        }
      } catch (err) {
        agentLog(
          "useActiveWorkout.ts:flushSaves",
          "upsertSessionExercise failed",
          {
            sessionId: sid,
            cardId: card.cardId,
            movementId: current.performedMovementId,
            movementName: current.performedName,
            sessionExerciseId: current.sessionExerciseId ?? null,
            error: formatUnknownError(err),
          },
          "A,G"
        );
        throw new Error(
          `${formatUnknownError(err)} (${current.performedName})`
        );
      }
    }

    setCards([...cardsRef.current]);
    if (sid) writeDraft(sid, cardsRef.current);
  }, [updatePendingState]);

  useEffect(() => {
    if (!templateReady) return;
    const key = `${splitId}:${workoutDate}`;
    if (initStarted.current && initKey.current === key) return;
    initStarted.current = true;
    initKey.current = key;

    (async () => {
      try {
        const sessionForDate = await getWorkoutSessionForDate(workoutDate);
        let sid: string;
        let resumed = false;
        let loaded: WorkoutCardDraft[] = [];

        if (sessionForDate) {
          sid = sessionForDate.id;
          resumed = true;
          loaded = await loadSessionCards(sid);
        } else {
          const session = await createWorkoutSession(splitId, workoutDate);
          sid = session.id;
          const lastLayout = await getLastCompletedSessionCards(splitId);
          if (lastLayout.length > 0) {
            loaded = lastLayout;
          }
        }

        setSessionId(sid);
        setIsResuming(resumed);

        const isCompleted = !!sessionForDate?.completed_at;
        if (isCompleted) {
          clearDraft(sid);
        }

        const draft = isCompleted ? null : readDraft(sid);
        let initial = loaded.length > 0 ? loaded : buildInitialCards();
        const dbCardCount = initial.length;
        if (draft?.cards?.length) {
          initial = mergeCards(initial, draft.cards);
        }

        agentLog(
          "useActiveWorkout.ts:init",
          "session initialized",
          {
            workoutDate,
            splitId,
            sessionId: sid,
            resumed,
            isCompleted,
            sessionForDateId: sessionForDate?.id ?? null,
            sessionForDateSplitId: sessionForDate?.split_id ?? null,
            dbCardCount,
            draftCardCount: draft?.cards?.length ?? 0,
            mergedCardCount: initial.length,
            movementIds: initial.map((c) => c.performedMovementId),
          },
          "B,G"
        );

        setCards(initial);
        setCardsReady(true);
        writeDraft(sid, initial);
      } catch (err) {
        agentLog(
          "useActiveWorkout.ts:init",
          "session init failed",
          {
            workoutDate,
            splitId,
            error: formatUnknownError(err),
          },
          "E"
        );
        setSaveStatus("error");
        setCards(buildInitialCards());
        setCardsReady(true);
      }
    })();
  }, [splitId, workoutDate, templateReady, buildInitialCards]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingCards.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (pendingCards.current.size > 0 || saveStatusRef.current === "error") {
        retryFailedSaves();
      }
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [retryFailedSaves]);

  useEffect(() => {
    return () => {
      for (const timer of debounceTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const updateCard = useCallback(
    (cardId: string, draft: WorkoutCardDraft) => {
      setCards((prev) => {
        const next = prev.map((c) => (c.cardId === cardId ? draft : c));
        if (sessionIdRef.current) writeDraft(sessionIdRef.current, next);
        return next;
      });
      scheduleCardSave(cardId);
    },
    [scheduleCardSave]
  );

  const removeCard = useCallback(
    async (cardId: string) => {
      const card = cardsRef.current.find((c) => c.cardId === cardId);
      const timer = debounceTimers.current.get(cardId);
      if (timer) {
        clearTimeout(timer);
        debounceTimers.current.delete(cardId);
      }
      pendingCards.current.delete(cardId);
      updatePendingState();

      if (card?.sessionExerciseId) {
        try {
          await deleteSessionExercise(card.sessionExerciseId);
        } catch {
          setSaveStatus("error");
        }
      }

      const next = cardsRef.current.filter((c) => c.cardId !== cardId);
      cardsRef.current = next;
      setCards(next);

      const sid = sessionIdRef.current;
      if (!sid) return;

      writeDraft(sid, next);
      try {
        const ordered = await persistCardOrder(sid, next);
        cardsRef.current = ordered;
        setCards(ordered);
        writeDraft(sid, ordered);
      } catch {
        setSaveStatus("error");
      }
    },
    [updatePendingState]
  );

  const addCard = useCallback((draft: WorkoutCardDraft) => {
    setCards((prev) => {
      const next = [...prev, draft];
      if (sessionIdRef.current) writeDraft(sessionIdRef.current, next);
      return next;
    });
  }, []);

  const moveCard = useCallback(async (cardId: string, direction: "up" | "down") => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    const prev = cardsRef.current;
    const index = prev.findIndex((c) => c.cardId === cardId);
    if (index < 0) return;

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= prev.length) return;

    const next = [...prev];
    [next[index], next[target]] = [next[target], next[index]];
    cardsRef.current = next;
    setCards(next);
    writeDraft(sid, next);

    try {
      const ordered = await persistCardOrder(sid, next);
      cardsRef.current = ordered;
      setCards(ordered);
      writeDraft(sid, ordered);
    } catch {
      setSaveStatus("error");
    }
  }, []);

  const canMoveUp = useCallback(
    (cardId: string) => {
      const index = cards.findIndex((c) => c.cardId === cardId);
      return index > 0;
    },
    [cards]
  );

  const canMoveDown = useCallback(
    (cardId: string) => {
      const index = cards.findIndex((c) => c.cardId === cardId);
      return index >= 0 && index < cards.length - 1;
    },
    [cards]
  );

  const startFresh = useCallback(async () => {
    await flushSaves();
    if (sessionIdRef.current) clearDraft(sessionIdRef.current);
    await abandonInProgressSession(splitId, workoutDate);
    const session = await createWorkoutSession(splitId, workoutDate);
    const lastLayout = await getLastCompletedSessionCards(splitId);
    const initial = lastLayout.length > 0 ? lastLayout : buildInitialCards();
    setSessionId(session.id);
    setIsResuming(false);
    setCards(initial);
    writeDraft(session.id, initial);
    setSaveStatus("idle");
  }, [splitId, workoutDate, buildInitialCards, flushSaves]);

  const finishWorkout = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) {
      agentLog(
        "useActiveWorkout.ts:finishWorkout",
        "missing sessionId",
        {},
        "E"
      );
      throw new Error("No active session. Reload and try again.");
    }

    agentLog(
      "useActiveWorkout.ts:finishWorkout",
      "finish started",
      {
        sessionId: sid,
        cardCount: cardsRef.current.length,
        cardsWithSets: cardsRef.current.filter(cardHasValidSet).length,
        movementIds: cardsRef.current.map((c) => c.performedMovementId),
      },
      "A,D"
    );

    try {
      if (await isWorkoutSessionCompleted(sid)) {
        agentLog(
          "useActiveWorkout.ts:finishWorkout",
          "session already completed",
          { sessionId: sid },
          "G"
        );
        clearDraft(sid);
        return;
      }

      await flushSaves();
    } catch (err) {
      const msg = formatUnknownError(err);
      agentLog(
        "useActiveWorkout.ts:finishWorkout",
        "flushSaves failed",
        { sessionId: sid, error: msg },
        "A,G"
      );
      throw new Error(`Save failed before finish: ${msg}`);
    }

    let ordered: WorkoutCardDraft[];
    try {
      ordered = await persistCardOrder(sid, cardsRef.current);
    } catch (err) {
      const msg = formatUnknownError(err);
      agentLog(
        "useActiveWorkout.ts:finishWorkout",
        "persistCardOrder failed",
        { sessionId: sid, error: msg },
        "D"
      );
      throw new Error(`Could not save exercise order: ${msg}`);
    }

    cardsRef.current = ordered;
    setCards(ordered);

    try {
      await completeWorkoutSession(sid);
    } catch (err) {
      const msg = formatUnknownError(err);
      agentLog(
        "useActiveWorkout.ts:finishWorkout",
        "completeWorkoutSession failed",
        { sessionId: sid, error: msg },
        "A"
      );
      throw new Error(`Could not mark workout complete: ${msg}`);
    }

    agentLog(
      "useActiveWorkout.ts:finishWorkout",
      "finish succeeded",
      { sessionId: sid },
      "A"
    );
    clearDraft(sid);
  }, [flushSaves]);

  const deleteWorkout = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await flushSaves();
    await deleteWorkoutSession(sid);
    clearDraft(sid);
  }, [flushSaves]);

  const hasSavedSets = cards.some(cardHasValidSet);

  return {
    sessionId,
    cards,
    cardsReady,
    isResuming,
    saveStatus,
    hasPendingSave,
    hasSavedSets,
    updateCard,
    removeCard,
    addCard,
    moveCard,
    canMoveUp,
    canMoveDown,
    startFresh,
    finishWorkout,
    deleteWorkout,
  };
}

export function useRunAutosave({
  splitId,
  workoutDate,
  slotId,
  movementId,
  movementName,
  targetMuscle,
  duration,
  distance,
  speed,
  elevation,
  note,
  buildNote,
  templateReady,
}: {
  splitId: string;
  workoutDate: string;
  slotId: string | null;
  movementId: string;
  movementName: string;
  targetMuscle: string;
  duration: string;
  distance: string;
  speed: string;
  elevation: string;
  note: string;
  buildNote: () => string | null;
  templateReady: boolean;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionExerciseId, setSessionExerciseId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hasPendingSave, setHasPendingSave] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(sessionId);
  const sessionExerciseIdRef = useRef(sessionExerciseId);
  const saveStatusRef = useRef(saveStatus);
  const initStarted = useRef(false);
  const initKey = useRef("");

  sessionIdRef.current = sessionId;
  sessionExerciseIdRef.current = sessionExerciseId;
  saveStatusRef.current = saveStatus;

  const buildRunDraft = useCallback((): WorkoutCardDraft | null => {
    const durationMin = parseInt(duration, 10);
    if (!durationMin || durationMin <= 0 || !movementId) return null;

    const distanceKm = distance.trim() ? parseFloat(distance) : 0;
    return {
      cardId: slotId ?? "run",
      slotId,
      sessionExerciseId: sessionExerciseIdRef.current,
      performedMovementId: movementId,
      performedName: movementName,
      targetMuscle,
      sets: [{ weight_kg: String(distanceKm), reps: String(durationMin) }],
      note: buildNote() ?? "",
    };
  }, [
    duration,
    distance,
    movementId,
    movementName,
    targetMuscle,
    slotId,
    buildNote,
  ]);

  const saveRun = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    const draft = buildRunDraft();
    if (!draft) {
      setHasPendingSave(false);
      return;
    }

    setSaveStatus("saving");
    try {
      const id = await upsertSessionExercise(sid, draft, 1);
      if (id) setSessionExerciseId(id);
      setHasPendingSave(false);
      setSaveStatus("saved");
    } catch {
      setHasPendingSave(false);
      setSaveStatus("error");
    }
  }, [buildRunDraft]);

  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setHasPendingSave(true);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void saveRun();
    }, DEBOUNCE_MS);
  }, [saveRun]);

  const flushSave = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    await saveRun();
  }, [saveRun]);

  const [resumeData, setResumeData] = useState<{
    duration: string;
    distance: string;
    note: string;
    movementId: string;
  } | null>(null);

  useEffect(() => {
    if (!templateReady || !movementId) return;
    const key = `${splitId}:${workoutDate}:${movementId}`;
    if (initStarted.current && initKey.current === key) return;
    initStarted.current = true;
    initKey.current = key;

    (async () => {
      try {
        const sessionForDate = await getWorkoutSessionForDate(workoutDate);
        let sid: string;

        if (sessionForDate) {
          sid = sessionForDate.id;
          setIsResuming(true);
          const cards = await loadSessionCards(sid);
          const runCard = cards[0];
          if (runCard?.sessionExerciseId) {
            setSessionExerciseId(runCard.sessionExerciseId);
          }
          if (runCard?.sets[0]) {
            setResumeData({
              duration: runCard.sets[0].reps,
              distance:
                parseFloat(runCard.sets[0].weight_kg) > 0
                  ? runCard.sets[0].weight_kg
                  : "",
              note: runCard.note ?? "",
              movementId: runCard.performedMovementId,
            });
          }
        } else {
          const session = await createWorkoutSession(splitId, workoutDate);
          sid = session.id;
        }

        setSessionId(sid);
        setReady(true);
      } catch {
        setSaveStatus("error");
        setReady(true);
      }
    })();
  }, [splitId, workoutDate, templateReady, movementId]);

  useEffect(() => {
    if (!ready || !sessionId) return;
    scheduleSave();
  }, [duration, distance, speed, elevation, note, movementId, ready, sessionId, scheduleSave]);

  useEffect(() => {
    const handler = () => {
      if (
        hasPendingSave ||
        saveStatusRef.current === "error" ||
        debounceRef.current
      ) {
        void saveRun();
      }
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [hasPendingSave, saveRun]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasPendingSave) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasPendingSave]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const finishRun = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await flushSave();
    await completeWorkoutSession(sid);
  }, [flushSave]);

  const deleteRun = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await flushSave();
    await deleteWorkoutSession(sid);
  }, [flushSave]);

  const canFinish =
    duration.trim() !== "" && parseInt(duration, 10) > 0;

  return {
    sessionId,
    isResuming,
    ready,
    saveStatus,
    hasPendingSave,
    canFinish,
    finishRun,
    deleteRun,
    resumeData,
  };
}
