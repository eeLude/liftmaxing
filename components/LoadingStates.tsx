"use client";

import { useLocale } from "@/components/LocaleProvider";

export function LoadingSpinner({ className = "h-5 w-5" }: { className?: string }) {
  const { t } = useLocale();
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-zinc-600 border-t-brand ${className}`}
      role="status"
      aria-label={t("common.loading")}
    />
  );
}

export function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-zinc-800"
          style={{ width: `${Math.max(40, 100 - i * 15)}%` }}
        />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      className="animate-pulse rounded-lg bg-zinc-800/80"
      style={{ height: 200 }}
      aria-hidden="true"
    />
  );
}

export function QueryErrorBanner({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useLocale();
  const text = message ?? t("common.error.load");

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
      <span>{text}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-red-800 px-2.5 py-1 text-xs font-medium text-red-200 hover:bg-red-900/40"
        >
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
