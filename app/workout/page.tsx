"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { getSplits } from "@/lib/queries";

export default function WorkoutSelectorPage() {
  const { data: splits, isLoading } = useQuery({
    queryKey: ["splits"],
    queryFn: getSplits,
  });

  return (
    <MobileLayout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Choose Split</h1>
        <p className="text-sm text-zinc-400">Select today&apos;s routine</p>
      </header>

      {isLoading && (
        <p className="text-center text-zinc-500">Loading splits...</p>
      )}

      <div className="space-y-3">
        {splits?.map((split) => (
          <Link
            key={split.id}
            href={`/workout/${split.id}`}
            className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition active:scale-[0.99]"
          >
            <span className="text-lg font-semibold text-zinc-100">
              {split.name}
            </span>
            <ChevronRight className="h-5 w-5 text-brand" />
          </Link>
        ))}
      </div>
    </MobileLayout>
  );
}
