export const HOMELAB_HOST = {
  name: "HP EliteDesk 800 G5 SFF",
  cpu: "i5-8500T",
  ramGb: 16,
  diskGb: 512,
} as const;

export const HOMELAB_ROUTER = {
  name: "ASUS RT-AX53U",
  via: "Home Assistant",
} as const;

export type HomelabServiceStatus = "planned" | "up" | "down";

export type HomelabService = {
  id: string;
  name: string;
  role: string;
  status: HomelabServiceStatus;
};

export type HomelabRouterStatus = {
  name: string;
  via: string;
  status: HomelabServiceStatus;
};

export type HomelabSnapshot = {
  online: boolean;
  lastSeen: string | null;
  cpuPct: number | null;
  memPct: number | null;
  diskPct: number | null;
  services: HomelabService[];
  router: HomelabRouterStatus;
};

export const PLANNED_SERVICES: HomelabService[] = [
  { id: "immich", name: "Immich", role: "Google Photos", status: "planned" },
  {
    id: "joplin",
    name: "Joplin Server",
    role: "Google Keep",
    status: "planned",
  },
  {
    id: "home-assistant",
    name: "Home Assistant",
    role: "Home + router later",
    status: "planned",
  },
  {
    id: "adguard",
    name: "AdGuard Home",
    role: "DNS · router points here",
    status: "planned",
  },
];

/** Four glance dots on the hub card, same order as planned services. */
export const GLANCE_SERVICE_IDS = PLANNED_SERVICES.map((s) => s.id);

export const PLANNED_ROUTER: HomelabRouterStatus = {
  name: HOMELAB_ROUTER.name,
  via: HOMELAB_ROUTER.via,
  status: "planned",
};

/** Live snapshot once a tunnel exists. Until then this is always null. */
export async function getHomelabSnapshot(): Promise<HomelabSnapshot | null> {
  return null;
}

export function glanceServices(
  snapshot: HomelabSnapshot | null
): HomelabService[] {
  const live = snapshot?.services ?? [];
  return PLANNED_SERVICES.map((planned) => {
    const hit = live.find((s) => s.id === planned.id);
    return hit ?? planned;
  });
}
