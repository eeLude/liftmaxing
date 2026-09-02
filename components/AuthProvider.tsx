"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { LoadingSpinner } from "@/components/LoadingStates";
import { useLocale } from "@/components/LocaleProvider";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/spotify/callback");
}

function AuthLoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-400">
      <LoadingSpinner className="h-6 w-6" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublicPath(pathname)) {
      router.replace("/login");
      return;
    }
    if (session && pathname === "/login") {
      router.replace("/");
    }
  }, [loading, session, pathname, router]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  if (loading) {
    return <AuthLoadingScreen message={t("auth.loading")} />;
  }

  if (!session && !isPublicPath(pathname)) {
    return <AuthLoadingScreen message={t("common.redirectLogin")} />;
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
