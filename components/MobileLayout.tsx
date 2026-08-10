"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";

export function MobileLayout({
  children,
  hideNav = false,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
}) {
  const pathname = usePathname();
  const isActiveWorkout =
    hideNav || /^\/workout\/[^/]+$/.test(pathname ?? "");

  return (
    <div className="min-h-dvh bg-zinc-950">
      <main
        className={`mx-auto max-w-lg px-4 pt-4 ${isActiveWorkout ? "pb-6" : "pb-24"}`}
      >
        {children}
      </main>
      {!isActiveWorkout && <BottomNav />}
    </div>
  );
}
