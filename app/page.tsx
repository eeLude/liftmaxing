"use client";

import { useAuth } from "@/components/AuthProvider";
import { MobileLayout } from "@/components/MobileLayout";
import { HUB_MODULES } from "@/lib/hub";

export default function HubPage() {
  const { signOut } = useAuth();

  return (
    <MobileLayout wide>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-400">Gym, reading & mood</p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Sign out
        </button>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {HUB_MODULES.map(({ id, Card }) => (
          <Card key={id} />
        ))}
      </div>
    </MobileLayout>
  );
}
