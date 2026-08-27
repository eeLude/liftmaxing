"use client";

import { MobileLayout } from "@/components/MobileLayout";
import { HUB_MODULES } from "@/lib/hub";

export default function HubPage() {
  return (
    <MobileLayout wide>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Liftmaxxing</h1>
        <p className="text-sm text-zinc-400">Gym, health & reading</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {HUB_MODULES.map(({ id, Card }) => (
          <Card key={id} />
        ))}
      </div>
    </MobileLayout>
  );
}
