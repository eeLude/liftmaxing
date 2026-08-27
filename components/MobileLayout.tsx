"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";

export function MobileLayout({
  children,
  hideNav = false,
  wide = false,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const isActiveWorkout =
    hideNav || /^\/workout\/[^/]+$/.test(pathname ?? "");

  return (
    <div className="min-h-dvh bg-zinc-950">
      <main
        className={`mx-auto px-4 pt-4 ${
          wide ? "max-w-lg md:max-w-6xl" : "max-w-lg"
        } ${isActiveWorkout ? "pb-6" : "pb-24"}`}
      >
        {children}
      </main>
      {!isActiveWorkout && <BottomNav />}
    </div>
  );
}
