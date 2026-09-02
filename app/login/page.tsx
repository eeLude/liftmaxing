"use client";

import { useState } from "react";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useLocale } from "@/components/LocaleProvider";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (signInError) {
      setError(signInError.message);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">{t("hub.title")}</h1>
          <LocaleToggle />
        </div>
        <p className="mt-1 text-sm text-zinc-400">{t("login.subtitle")}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">
              {t("login.email")}
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">
              {t("login.password")}
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60"
          >
            {busy ? t("login.wait") : t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
