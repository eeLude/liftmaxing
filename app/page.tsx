"use client";

import { useAuth } from "@/components/AuthProvider";
import { LocaleToggle } from "@/components/LocaleToggle";
import { HubMasonry } from "@/components/hub/HubMasonry";
import { MobileLayout } from "@/components/MobileLayout";
import { useLocale } from "@/components/LocaleProvider";
import { HUB_MODULES } from "@/lib/hub";

export default function HubPage() {
  const { signOut } = useAuth();
  const { t } = useLocale();

  return (
    <MobileLayout wide>
      <header className="mb-6 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-100">{t("hub.title")}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <LocaleToggle />
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            {t("common.signOut")}
          </button>
        </div>
      </header>

      <HubMasonry>
        {HUB_MODULES.map(({ id, Card }) => (
          <Card key={id} />
        ))}
      </HubMasonry>
    </MobileLayout>
  );
}
