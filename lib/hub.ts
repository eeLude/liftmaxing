"use client";

import type { ComponentType } from "react";
import { HubBooksCard } from "@/components/hub/HubBooksCard";
import { HubGymCard } from "@/components/hub/HubGymCard";

export type HubModule = {
  id: string;
  Card: ComponentType;
};

/** Add a new domain: create HubXCard and append it here. */
export const HUB_MODULES: HubModule[] = [
  { id: "gym", Card: HubGymCard },
  { id: "books", Card: HubBooksCard },
];
