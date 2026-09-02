"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HubCard } from "@/components/hub/HubCard";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import {
  getHomelabSnapshot,
  glanceServices,
  type HomelabServiceStatus,
} from "@/lib/homelab";
import { formatLocaleNumber } from "@/lib/utils";

function statusDotClass(status: HomelabServiceStatus): string {
  if (status === "up") return "bg-emerald-500";
  if (status === "down") return "bg-red-500";
  return "bg-zinc-600";
}

export function HubHomelabCard() {
  const query = useQuery({
    queryKey: ["homelab-snapshot"],
    queryFn: getHomelabSnapshot,
  });

  const snapshot = query.data ?? null;
  const online = snapshot?.online === true;
  const services = glanceServices(snapshot);

  return (
    <HubCard
      title="Homelab"
      footer={
        <Link
          href="/homelab"
          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
        >
          Open homelab
          <ChevronRight className="h-4 w-4" />
        </Link>
      }
    >
      {query.isError && (
        <QueryErrorBanner
          message="Could not load homelab."
          onRetry={() => void query.refetch()}
        />
      )}
      {query.isLoading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}
      {!query.isLoading && !query.isError && (
        <>
          {online ? (
            <>
              <p className="text-3xl font-semibold tracking-tight text-emerald-400">
                Online
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                CPU {formatLocaleNumber(snapshot!.cpuPct ?? 0, 0)}%
                {" · "}
                RAM {formatLocaleNumber(snapshot!.memPct ?? 0, 0)}%
                {" · "}
                disk {formatLocaleNumber(snapshot!.diskPct ?? 0, 0)}%
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-semibold tracking-tight text-zinc-100">
                Offline
              </p>
              <p className="mt-1 text-sm text-zinc-500">PC not online yet</p>
            </>
          )}
          <div className="mt-4 flex gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
                title={`${service.name} · ${service.status}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${statusDotClass(service.status)}`}
                />
                <p className="w-full truncate text-center text-[10px] text-zinc-500">
                  {service.id === "home-assistant" ? "HA" : service.name.split(" ")[0]}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </HubCard>
  );
}
