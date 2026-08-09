import { BottomNav } from "@/components/BottomNav";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-950">
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
