"use client";

import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/MobileLayout";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import {
  HOMELAB_HOST,
  PLANNED_ROUTER,
  getHomelabSnapshot,
  glanceServices,
  type HomelabServiceStatus,
} from "@/lib/homelab";
import { formatLocaleNumber } from "@/lib/utils";

function statusLabel(status: HomelabServiceStatus): string {
  if (status === "up") return "up";
  if (status === "down") return "down";
  return "planned";
}

function statusClass(status: HomelabServiceStatus): string {
  if (status === "up") return "text-emerald-400";
  if (status === "down") return "text-red-400";
  return "text-zinc-500";
}

function ResourceBar({
  label,
  pct,
}: {
  label: string;
  pct: number | null;
}) {
  const ready = pct != null && Number.isFinite(pct);
  const width = ready ? Math.min(100, Math.max(0, pct)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <p className="text-sm text-zinc-300">
          {ready ? `${formatLocaleNumber(pct, 0)}%` : "—"}
        </p>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${ready ? "bg-zinc-400" : "bg-zinc-800"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function HomelabPage() {
  const query = useQuery({
    queryKey: ["homelab-snapshot"],
    queryFn: getHomelabSnapshot,
  });

  const snapshot = query.data ?? null;
  const services = glanceServices(snapshot);
  const router = snapshot?.router ?? PLANNED_ROUTER;
  const online = snapshot?.online === true;

  return (
    <MobileLayout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Homelab</h1>
        <p className="text-sm text-zinc-400">
          {HOMELAB_HOST.name}
        </p>
      </header>

      {query.isError && (
        <QueryErrorBanner
          message="Could not load homelab."
          onRetry={() => void query.refetch()}
        />
      )}

      {query.isLoading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}

      <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Host
        </h2>
        <p className="mt-2 text-lg font-semibold text-zinc-100">
          {online ? "Online" : "Offline"}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {HOMELAB_HOST.cpu} · {HOMELAB_HOST.ramGb} GB · {HOMELAB_HOST.diskGb}{" "}
          GB SSD
        </p>
        {!online && (
          <p className="mt-2 text-sm text-zinc-600">PC not online yet</p>
        )}
        <div className="mt-4 space-y-3">
          <ResourceBar label="CPU" pct={snapshot?.cpuPct ?? null} />
          <ResourceBar label="Memory" pct={snapshot?.memPct ?? null} />
          <ResourceBar label="Disk" pct={snapshot?.diskPct ?? null} />
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Services
        </h2>
        <ul className="mt-3 divide-y divide-zinc-800">
          {services.map((service) => (
            <li
              key={service.id}
              className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200">
                  {service.name}
                </p>
                <p className="text-xs text-zinc-500">{service.role}</p>
              </div>
              <p
                className={`shrink-0 text-xs font-medium ${statusClass(service.status)}`}
              >
                {statusLabel(service.status)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Network
        </h2>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200">{router.name}</p>
            <p className="text-xs text-zinc-500">via {router.via}</p>
          </div>
          <p
            className={`shrink-0 text-xs font-medium ${statusClass(router.status)}`}
          >
            {statusLabel(router.status)}
          </p>
        </div>
      </section>
    </MobileLayout>
  );
}
