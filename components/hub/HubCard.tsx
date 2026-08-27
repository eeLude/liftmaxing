import type { ReactNode } from "react";

export function HubCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </h2>
      <div className="mt-2 flex min-h-0 flex-1 flex-col">{children}</div>
      {footer != null && <div className="mt-5">{footer}</div>}
    </section>
  );
}
