"use client";

import type { SaveStatus } from "@/lib/useActiveWorkout";

export function SaveStatusText({
  status,
  hasPendingSave,
}: {
  status: SaveStatus;
  hasPendingSave: boolean;
}) {
  if (status === "saving" || hasPendingSave) {
    return <span className="text-xs text-zinc-500">Saving…</span>;
  }
  if (status === "error") {
    return (
      <span className="text-xs text-amber-500">
        Save failed — edit again to retry
      </span>
    );
  }
  if (status === "saved") {
    return <span className="text-xs text-zinc-500">Saved</span>;
  }
  return null;
}
