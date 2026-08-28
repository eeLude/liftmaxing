"use client";

import type { ComponentType } from "react";
import { HubBooksCard } from "@/components/hub/HubBooksCard";
import { HubElectricityCard } from "@/components/hub/HubElectricityCard";
import { HubGymCard } from "@/components/hub/HubGymCard";
import { HubMoodCard } from "@/components/hub/HubMoodCard";
import { HubPortfolioCard } from "@/components/hub/HubPortfolioCard";
import { HubSpotifyCard } from "@/components/hub/HubSpotifyCard";
import { HubWeatherCard } from "@/components/hub/HubWeatherCard";

export type HubModule = {
  id: string;
  Card: ComponentType;
};

/** Add a new domain: create HubXCard and append it here. HubMasonry packs by height. */
export const HUB_MODULES: HubModule[] = [
  { id: "weather", Card: HubWeatherCard },
  { id: "electricity", Card: HubElectricityCard },
  { id: "mood", Card: HubMoodCard },
  { id: "gym", Card: HubGymCard },
  { id: "portfolio", Card: HubPortfolioCard },
  { id: "books", Card: HubBooksCard },
  { id: "spotify", Card: HubSpotifyCard },
];
