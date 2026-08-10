"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  abandonInProgressSession,
  completeWorkoutSession,
  createWorkoutSession,
  deleteSessionExercise,
  deleteWorkoutSession,
  getWorkoutSessionForDate,
  loadSessionCards,
  upsertSessionExercise,
} from "@/lib/queries";
import type { WorkoutCardDraft } from "@/types/database";

const DEBOUNCE_MS = 1500;
const DRAFT_PREFIX = "liftmaxxing:draft:";

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
        }

        setSessionId(sid);
        setIsResuming(resumed);

        const draft = readDraft(sid);
        let initial = loaded.length > 0 ? loaded : buildInitialCards();
        if (draft?.cards?.length) {
          initial = mergeCards(initial, draft.cards);
        }

        setCards(initial);
        setCardsReady(true);
        writeDraft(sid, initial);
      } catch {
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

      setCards((prev) => {
        const next = prev.filter((c) => c.cardId !== cardId);
        if (sessionIdRef.current) writeDraft(sessionIdRef.current, next);
        return next;
      });
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

  const startFresh = useCallback(async () => {
    await flushSaves();
    if (sessionIdRef.current) clearDraft(sessionIdRef.current);
    await abandonInProgressSession(splitId, workoutDate);
    const session = await createWorkoutSession(splitId, workoutDate);
    const initial = buildInitialCards();
    setSessionId(session.id);
    setIsResuming(false);
    setCards(initial);
    writeDraft(session.id, initial);
    setSaveStatus("idle");
  }, [splitId, workoutDate, buildInitialCards, flushSaves]);

  const finishWorkout = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await flushSaves();
    await completeWorkoutSession(sid);
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
