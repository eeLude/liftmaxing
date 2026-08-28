"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { HubPortfolioChart } from "@/components/charts/HubPortfolioChart";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  HidePortfolioValuesButton,
  useHidePortfolioValues,
} from "@/components/HidePortfolioValuesButton";
import { MobileLayout } from "@/components/MobileLayout";
import { QueryErrorBanner } from "@/components/LoadingStates";
import { PortfolioFilters } from "@/components/PortfolioFilters";
import { formatSignedPct } from "@/lib/goals";
import {
  allocationByAccount,
  allocationByKind,
  computePortfolio,
  detectHintsInText,
  filterHoldingsByAccount,
  formatEur,
  formatSignedEur,
  HIDDEN_EUR,
  holdingsRangeChange,
  hintFromName,
  KIND_LABEL,
  QUOTE_STALE_MS,
  UNIQUE_TICKER_HINTS,
  quotesCoverHoldings,
  uniqueQuoteTickers,
  type AccountFilter,
  type TickerHint,
} from "@/lib/portfolio";
import {
  deleteHolding,
  fetchPortfolioQuotes,
  getHoldings,
  upsertHolding,
  type HoldingInput,
} from "@/lib/queries";
import { formatLocaleNumber, parseLocaleNumber } from "@/lib/utils";
import type { HoldingAccount, HoldingKind, PortfolioHolding } from "@/types/database";

type FormState = {
  id?: string;
  name: string;
  ticker: string;
  kind: HoldingKind;
  account: HoldingAccount;
  qty: string;
  cost_eur: string;
  currency: string;
};

const emptyForm = (): FormState => ({
  name: "",
  ticker: "",
  kind: "stock",
  account: "OST",
  qty: "",
  cost_eur: "",
  currency: "EUR",
});

function holdingToForm(row: PortfolioHolding): FormState {
  return {
    id: row.id,
    name: row.name,
    ticker: row.ticker,
    kind: row.kind,
    account: row.account,
    qty: String(row.qty),
    cost_eur: String(row.cost_eur),
    currency: row.currency,
  };
}

function hintToForm(hint: TickerHint, prev?: FormState): FormState {
  return {
    ...emptyForm(),
    ...prev,
    name: hint.name,
    ticker: hint.ticker,
    kind: hint.kind,
    account: hint.account,
    currency: hint.currency,
  };
}

function formToInput(form: FormState): HoldingInput {
  const qty = parseLocaleNumber(form.qty);
  const cost = parseLocaleNumber(form.cost_eur);
  if (qty == null) throw new Error("Quantity is required");
  if (cost == null) throw new Error("Cost in EUR is required");
  return {
    id: form.id,
    name: form.name,
    ticker: form.ticker,
    kind: form.kind,
    account: form.account,
    qty,
    cost_eur: cost,
    currency: form.currency,
  };
}

export default function PortfolioPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [detected, setDetected] = useState<TickerHint[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [account, setAccount] = useState<AccountFilter>("combined");
  const { hidden, toggle } = useHidePortfolioValues();

  const holdingsQuery = useQuery({
    queryKey: ["portfolio-holdings"],
    queryFn: getHoldings,
  });

  const holdings = holdingsQuery.data ?? [];
  const scopedHoldings = useMemo(
    () => filterHoldingsByAccount(holdings, account),
    [holdings, account]
  );
  const tickers = uniqueQuoteTickers(scopedHoldings);

  const quotesQuery = useQuery({
    queryKey: ["portfolio-quotes", tickers.join(","), "1mo"],
    queryFn: () => fetchPortfolioQuotes(accessToken!, tickers, "1mo"),
    enabled: Boolean(accessToken) && holdingsQuery.isSuccess,
    staleTime: QUOTE_STALE_MS,
    placeholderData: keepPreviousData,
  });

  const snapshot = useMemo(() => {
    if (!quotesQuery.data) return null;
    if (!quotesCoverHoldings(scopedHoldings, quotesQuery.data)) return null;
    return computePortfolio(scopedHoldings, quotesQuery.data);
  }, [scopedHoldings, quotesQuery.data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["portfolio-holdings"] });
    void queryClient.invalidateQueries({ queryKey: ["portfolio-quotes"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => upsertHolding(formToInput(form)),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setForm(emptyForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHolding(id),
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
      setFormOpen(false);
      setForm(emptyForm());
    },
  });

  const openNew = () => {
    setForm(emptyForm());
    setFormOpen(true);
  };

  const applyHint = (hint: TickerHint) => {
    setForm((prev) =>
      formOpen && !prev.id ? hintToForm(hint, prev) : hintToForm(hint)
    );
    setFormOpen(true);
  };

  const onNameChange = (name: string) => {
    const hint = hintFromName(name);
    setForm((prev) => {
      if (!hint) return { ...prev, name };
      const tickerEmpty = !prev.ticker.trim();
      return {
        ...prev,
        name,
        ticker: tickerEmpty ? hint.ticker : prev.ticker,
        kind: tickerEmpty ? hint.kind : prev.kind,
        account: tickerEmpty ? hint.account : prev.account,
        currency: tickerEmpty ? hint.currency : prev.currency,
      };
    });
  };

  const rows = snapshot?.rows ?? [];
  const byAccount = snapshot ? allocationByAccount(snapshot.rows) : [];
  const byKind = snapshot ? allocationByKind(snapshot.rows) : [];
  const rangeChange = snapshot ? holdingsRangeChange(snapshot) : null;
  const rangeTone =
    rangeChange != null && rangeChange.eur > 0
      ? "text-emerald-400"
      : rangeChange != null && rangeChange.eur < 0
        ? "text-red-400"
        : "text-zinc-400";
  const pnlTone =
    snapshot && snapshot.pnlEur > 0
      ? "text-emerald-400"
      : snapshot && snapshot.pnlEur < 0
        ? "text-red-400"
        : "text-zinc-400";

  return (
    <MobileLayout>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Portfolio</h1>
          <p className="text-sm text-zinc-400">Current holdings · Yahoo</p>
        </div>
        <div className="flex items-center gap-2">
          <HidePortfolioValuesButton hidden={hidden} onToggle={toggle} />
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </header>

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

      {holdings.length > 0 && (
        <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <PortfolioFilters account={account} onAccount={setAccount} />
          {snapshot && scopedHoldings.length > 0 && (
            <>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100">
                {hidden ? HIDDEN_EUR : formatEur(snapshot.totalEur, 0)}
              </p>
              {rangeChange && (
                <p className={`mt-1 text-sm ${rangeTone}`}>
                  {!hidden && (
                    <>
                      {formatSignedEur(rangeChange.eur, 0)}
                      {rangeChange.pct != null && " · "}
                    </>
                  )}
                  {rangeChange.pct != null && formatSignedPct(rangeChange.pct)}
                  <span className="text-zinc-500"> 1 kk · current holdings</span>
                </p>
              )}
              {!hidden && (
                <p className={`text-sm ${pnlTone}`}>
                  {formatSignedEur(snapshot.pnlEur, 0)}
                  <span className="text-zinc-500"> vs {formatEur(snapshot.costEur, 0)} cost</span>
                </p>
              )}
              {quotesQuery.isFetching && (
                <p className="mt-1 text-xs text-zinc-600">Updating…</p>
              )}
              <HubPortfolioChart
                history={snapshot.history}
                hideValues={hidden}
              />
            </>
          )}
          {scopedHoldings.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500">No holdings in this account</p>
          )}
        </section>
      )}

      {snapshot && scopedHoldings.length > 0 && (
        <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Allocation
          </h2>
          <AllocationBar
            parts={byAccount.map((p) => ({
              key: p.account,
              label: p.account,
              pct: p.pct,
              value: p.valueEur,
            }))}
          />
          <AllocationBar
            parts={byKind.map((p) => ({
              key: p.kind,
              label: KIND_LABEL[p.kind],
              pct: p.pct,
              value: p.valueEur,
            }))}
          />
        </section>
      )}

      {formOpen && (
        <form
          className="mb-4 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <h2 className="text-sm font-medium text-zinc-300">
            {form.id ? "Edit holding" : "Add holding"}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {UNIQUE_TICKER_HINTS.map((hint) => (
              <button
                key={hint.ticker}
                type="button"
                onClick={() => applyHint(hint)}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500"
              >
                {hint.name}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 px-4 py-3"
              placeholder="Harvia"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              Yahoo ticker
            </span>
            <input
              required
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              className="w-full rounded-xl border border-zinc-700 px-4 py-3"
              placeholder="HARVIA.HE"
            />
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">Kind</span>
            <div className="grid grid-cols-3 gap-2">
              {(["stock", "fund", "cash"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setForm({ ...form, kind })}
                  className={`rounded-xl border py-2.5 text-sm font-medium ${
                    form.kind === kind
                      ? "border-brand bg-brand text-white"
                      : "border-zinc-700 text-zinc-300"
                  }`}
                >
                  {KIND_LABEL[kind]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              Account
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["OST", "AOT"] as const).map((account) => (
                <button
                  key={account}
                  type="button"
                  onClick={() => setForm({ ...form, account })}
                  className={`rounded-xl border py-2.5 text-sm font-medium ${
                    form.account === account
                      ? "border-brand bg-brand text-white"
                      : "border-zinc-700 text-zinc-300"
                  }`}
                >
                  {account}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-300">
                Quantity
              </span>
              <input
                required
                inputMode="decimal"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                className="w-full rounded-xl border border-zinc-700 px-4 py-3"
                placeholder="10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-300">
                Cost €
              </span>
              <input
                required
                inputMode="decimal"
                value={form.cost_eur}
                onChange={(e) => setForm({ ...form, cost_eur: e.target.value })}
                className="w-full rounded-xl border border-zinc-700 px-4 py-3"
                placeholder="Total paid"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              Currency
            </span>
            <input
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full rounded-xl border border-zinc-700 px-4 py-3"
              placeholder="EUR"
            />
          </label>
          {saveMutation.isError && (
            <p className="text-sm text-red-400">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : "Could not save. Run supabase/migrate-portfolio.sql if the table is missing."}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setForm(emptyForm());
              }}
              className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-medium text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
          {form.id && (
            <button
              type="button"
              onClick={() => setDeleteId(form.id ?? null)}
              className="w-full py-2 text-sm text-red-400"
            >
              Delete holding
            </button>
          )}
        </form>
      )}

      <section className="mb-4">
        <button
          type="button"
          onClick={() => setPasteOpen((open) => !open)}
          className="text-sm text-zinc-500 underline decoration-zinc-700 underline-offset-2"
        >
          {pasteOpen ? "Hide paste import" : "Optional: seed from pasted PDF text"}
        </button>
        {pasteOpen && (
          <div className="mt-3 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">
              Paste names from a Nordnet PDF. This only fills tickers — enter quantity
              and cost yourself. Nothing is uploaded.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-zinc-700 px-4 py-3"
              placeholder="Harvia, NVIDIA, Nordnet Suomi Indeksi…"
            />
            <button
              type="button"
              onClick={() => setDetected(detectHintsInText(pasteText))}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200"
            >
              Detect names
            </button>
            {detected.length > 0 && (
              <ul className="space-y-2">
                {detected.map((hint) => (
                  <li key={hint.ticker} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-zinc-300">
                      {hint.name}{" "}
                      <span className="text-zinc-500">{hint.ticker}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => applyHint(hint)}
                      className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-200"
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {detected.length === 0 && pasteText.trim() !== "" && (
              <p className="text-sm text-zinc-500">No known names in that text.</p>
            )}
          </div>
        )}
      </section>

      {!holdingsQuery.isLoading &&
        !holdingsQuery.isError &&
        holdings.length === 0 &&
        !formOpen && (
        <p className="mb-4 text-sm text-zinc-500">
          Add a position after a buy. Prices come from Yahoo, not Nordnet.
        </p>
      )}

      {rows.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Holdings
          </h2>
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    setForm(holdingToForm(row));
                    setFormOpen(true);
                  }}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left hover:border-zinc-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">{row.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {row.account} · {KIND_LABEL[row.kind]} · {row.ticker}
                      </p>
                    </div>
                    <p className="text-right text-sm font-medium text-zinc-100">
                      {hidden
                        ? HIDDEN_EUR
                        : row.valueEur != null
                          ? formatEur(row.valueEur, 0)
                          : "—"}
                    </p>
                  </div>
                  {!hidden && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatLocaleNumber(row.qty, 4)} ×{" "}
                      {row.last != null ? formatLocaleNumber(row.last, 2) : "?"}{" "}
                      {row.quoteCurrency}
                      {row.pnlEur != null && (
                        <span
                          className={
                            row.pnlEur > 0
                              ? "text-emerald-400"
                              : row.pnlEur < 0
                                ? "text-red-400"
                                : ""
                          }
                        >
                          {" "}
                          · {formatSignedEur(row.pnlEur, 0)}
                        </span>
                      )}
                    </p>
                  )}
                  {row.quoteError && (
                    <p className="mt-1 text-xs text-amber-500">{row.quoteError}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={deleteId != null}
        title="Delete this holding?"
        message="This removes the position. Prices are not stored."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </MobileLayout>
  );
}

function AllocationBar({
  parts,
}: {
  parts: { key: string; label: string; pct: number; value: number }[];
}) {
  const visible = parts.filter((p) => p.value > 0);
  if (!visible.length) return null;
  return (
    <div className="mt-3">
      <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
        {visible.map((part, i) => (
          <div
            key={part.key}
            className={i % 2 === 0 ? "bg-brand" : "bg-zinc-500"}
            style={{ width: `${part.pct}%` }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        {visible
          .map(
            (part) =>
              `${part.label} ${formatLocaleNumber(part.pct, 0)}%`
          )
          .join(" · ")}
      </p>
    </div>
  );
}
