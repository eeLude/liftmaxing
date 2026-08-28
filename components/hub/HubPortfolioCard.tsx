"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Wallet } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { HubPortfolioChart } from "@/components/charts/HubPortfolioChart";
import { HubCard } from "@/components/hub/HubCard";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import { PortfolioFilters } from "@/components/PortfolioFilters";
import { formatSignedPct } from "@/lib/goals";
import {
  computePortfolio,
  filterHoldingsByAccount,
  formatEur,
  formatSignedEur,
  holdingsRangeChange,
  QUOTE_STALE_MS,
  quotesCoverHoldings,
  uniqueQuoteTickers,
  type AccountFilter,
} from "@/lib/portfolio";
import { fetchPortfolioQuotes, getHoldings } from "@/lib/queries";

const CHART_RANGE = "1mo" as const;

export function HubPortfolioCard() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [account, setAccount] = useState<AccountFilter>("combined");

  const holdingsQuery = useQuery({
    queryKey: ["portfolio-holdings"],
    queryFn: getHoldings,
  });

  const scopedHoldings = useMemo(
    () => filterHoldingsByAccount(holdingsQuery.data ?? [], account),
    [holdingsQuery.data, account]
  );
  const tickers = uniqueQuoteTickers(scopedHoldings);

  const quotesQuery = useQuery({
    queryKey: ["portfolio-quotes", tickers.join(","), CHART_RANGE],
    queryFn: () => fetchPortfolioQuotes(accessToken!, tickers, CHART_RANGE),
    enabled: Boolean(accessToken) && holdingsQuery.isSuccess,
    staleTime: QUOTE_STALE_MS,
    placeholderData: keepPreviousData,
  });

  const snapshot =
    holdingsQuery.data &&
    quotesQuery.data &&
    quotesCoverHoldings(scopedHoldings, quotesQuery.data)
      ? computePortfolio(scopedHoldings, quotesQuery.data)
      : null;

  const rangeChange = snapshot ? holdingsRangeChange(snapshot) : null;
  const rangeTone =
    rangeChange != null && rangeChange.eur > 0
      ? "text-emerald-400"
      : rangeChange != null && rangeChange.eur < 0
        ? "text-red-400"
        : "text-zinc-400";
  const pnlTone =
    snapshot != null && snapshot.pnlEur > 0
      ? "text-emerald-400"
      : snapshot != null && snapshot.pnlEur < 0
        ? "text-red-400"
        : "text-zinc-400";

  return (
    <HubCard
      title="Portfolio"
      footer={
        <Link
          href="/portfolio"
          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
        >
          Open portfolio
          <ChevronRight className="h-4 w-4" />
        </Link>
      }
    >
      {holdingsQuery.isError && (
        <QueryErrorBanner
          message="Could not load holdings. Run supabase/migrate-portfolio.sql if the table is missing."
          onRetry={() => void holdingsQuery.refetch()}
        />
      )}
      {quotesQuery.isError && (
        <QueryErrorBanner
          message="Could not load prices."
          onRetry={() => void quotesQuery.refetch()}
        />
      )}
      {(holdingsQuery.isLoading ||
        (scopedHoldings.length > 0 &&
          (quotesQuery.isLoading || quotesQuery.isFetching) &&
          !snapshot)) && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}
      {holdingsQuery.isSuccess && (holdingsQuery.data ?? []).length === 0 && (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-brand">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-sm text-zinc-500">No holdings yet</p>
        </div>
      )}
      {holdingsQuery.isSuccess &&
        (holdingsQuery.data ?? []).length > 0 &&
        scopedHoldings.length === 0 && (
          <>
            <PortfolioFilters account={account} onAccount={setAccount} />
            <p className="mt-3 text-sm text-zinc-500">No holdings in this account</p>
          </>
        )}
      {snapshot && scopedHoldings.length > 0 && (
        <>
          <PortfolioFilters account={account} onAccount={setAccount} />
          <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100">
            {formatEur(snapshot.totalEur, 0)}
          </p>
          {rangeChange && (
            <p className={`mt-1 text-sm ${rangeTone}`}>
              {formatSignedEur(rangeChange.eur, 0)}
              {rangeChange.pct != null && (
                <> · {formatSignedPct(rangeChange.pct)}</>
              )}
              <span className="text-zinc-500"> 1 kk · current holdings</span>
            </p>
          )}
          <p className={`text-sm ${pnlTone}`}>
            {formatSignedEur(snapshot.pnlEur, 0)}
            <span className="text-zinc-500"> vs cost</span>
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">
            Current holdings · Yahoo
          </p>
          {snapshot.failedTickers.length > 0 && (
            <p className="mt-1 text-xs text-amber-500">
              No price for {snapshot.failedTickers.join(", ")}
            </p>
          )}
          {quotesQuery.isFetching && (
            <p className="mt-1 text-xs text-zinc-600">Updating…</p>
          )}
          <HubPortfolioChart history={snapshot.history} />
        </>
      )}
    </HubCard>
  );
}
