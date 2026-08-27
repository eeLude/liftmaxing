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
    <section className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </h2>
      <div className="mt-2 flex flex-col">{children}</div>
      {footer != null && <div className="mt-4">{footer}</div>}
    </section>
  );
}
