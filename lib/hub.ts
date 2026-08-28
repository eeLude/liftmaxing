"use client";

import type { ComponentType } from "react";
import { HubBooksCard } from "@/components/hub/HubBooksCard";
import { HubGymCard } from "@/components/hub/HubGymCard";
import { HubMoodCard } from "@/components/hub/HubMoodCard";
import { HubWeatherCard } from "@/components/hub/HubWeatherCard";

export type HubModule = {
  id: string;
  Card: ComponentType;
};

/** Add a new domain: create HubXCard and append it here. */
export const HUB_MODULES: HubModule[] = [
  { id: "weather", Card: HubWeatherCard },
  { id: "gym", Card: HubGymCard },
  { id: "books", Card: HubBooksCard },
  { id: "mood", Card: HubMoodCard },
];
