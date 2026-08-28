import { formatLocaleNumber } from "@/lib/utils";
import type {
  HoldingAccount,
  HoldingKind,
  PortfolioHolding,
} from "@/types/database";

export const QUOTE_STALE_MS = 15 * 60 * 1000;
export const MAX_QUOTE_TICKERS = 40;

export const YAHOO_RANGES = ["5d", "1mo", "ytd", "1y"] as const;
export type YahooRange = (typeof YAHOO_RANGES)[number];

export type AccountFilter = "combined" | HoldingAccount;

export const ACCOUNT_FILTERS: { id: AccountFilter; label: string }[] = [
  { id: "combined", label: "Combined" },
  { id: "OST", label: "OST" },
  { id: "AOT", label: "AOT" },
];

export function parseYahooRange(value: string | null): YahooRange {
  if (value === "5d" || value === "1mo" || value === "ytd" || value === "1y") {
    return value;
  }
  return "1mo";
}

export function filterHoldingsByAccount(
  holdings: PortfolioHolding[],
  filter: AccountFilter
): PortfolioHolding[] {
  if (filter === "combined") return holdings;
  return holdings.filter((row) => row.account === filter);
}

export function quotesCoverHoldings(
  holdings: PortfolioHolding[],
  quotes: QuotesResponse
): boolean {
  const have = new Set(
    quotes.quotes.map((q) => q.ticker.trim().toUpperCase())
  );
  return uniqueQuoteTickers(holdings).every((ticker) => have.has(ticker));
}

export const CASH_TICKERS = new Set(["CASH", "EUR", "CASH.EUR"]);

export type QuotePoint = {
  date: string;
  close: number;
};

export type InstrumentQuote = {
  ticker: string;
  currency: string;
  last: number | null;
  prevClose: number | null;
  history: QuotePoint[];
  error?: string;
};

export type FxQuote = {
  last: number;
  history: QuotePoint[];
};

export type QuotesResponse = {
  quotes: InstrumentQuote[];
  fx: Record<string, FxQuote>;
};

export type TickerHint = {
  match: string;
  name: string;
  ticker: string;
  kind: HoldingKind;
  currency: string;
  account: HoldingAccount;
};

/** Name → Yahoo symbol. Quantities stay in Supabase, not here. */
export const TICKER_HINTS: TickerHint[] = [
  {
    match: "harvia",
    name: "Harvia",
    ticker: "HARVIA.HE",
    kind: "stock",
    currency: "EUR",
    account: "OST",
  },
  {
    match: "nvidia",
    name: "NVIDIA",
    ticker: "NVDA",
    kind: "stock",
    currency: "USD",
    account: "OST",
  },
  {
    match: "qt group",
    name: "Qt Group",
    ticker: "QTCOM.HE",
    kind: "stock",
    currency: "EUR",
    account: "OST",
  },
  {
    match: "qtcom",
    name: "Qt Group",
    ticker: "QTCOM.HE",
    kind: "stock",
    currency: "EUR",
    account: "OST",
  },
  {
    match: "spinnova",
    name: "Spinnova",
    ticker: "SPINN.HE",
    kind: "stock",
    currency: "EUR",
    account: "OST",
  },
  {
    match: "ishares core s&p 500",
    name: "iShares Core S&P 500 UCITS ETF",
    ticker: "SXR8.DE",
    kind: "fund",
    currency: "EUR",
    account: "AOT",
  },
  {
    match: "sxr8",
    name: "iShares Core S&P 500 UCITS ETF",
    ticker: "SXR8.DE",
    kind: "fund",
    currency: "EUR",
    account: "AOT",
  },
  {
    match: "vaneck semiconductor",
    name: "VanEck Semiconductor UCITS ETF",
    ticker: "VVSM.DE",
    kind: "fund",
    currency: "EUR",
    account: "AOT",
  },
  {
    match: "nordnet kehittyvät",
    name: "Nordnet Kehittyvät Markkinat Indeksi",
    ticker: "0P0001K6NA.F",
    kind: "fund",
    currency: "EUR",
    account: "AOT",
  },
  {
    match: "nordnet maailma",
    name: "Nordnet Maailma Indeksi",
    ticker: "0P0001K6NI.F",
    kind: "fund",
    currency: "EUR",
    account: "AOT",
  },
  {
    match: "nordnet norge",
    name: "Nordnet Norge Indeks",
    ticker: "0P000134K7.IR",
    kind: "fund",
    currency: "NOK",
    account: "AOT",
  },
  {
    match: "nordnet suomi",
    name: "Nordnet Suomi Indeksi",
    ticker: "0P000134K9.F",
    kind: "fund",
    currency: "EUR",
    account: "AOT",
  },
  {
    match: "nordnet sverige",
    name: "Nordnet Sverige Index",
    ticker: "0P0000J24W.ST",
    kind: "fund",
    currency: "SEK",
    account: "AOT",
  },
  {
    match: "nordnet teknologia",
    name: "Nordnet Teknologia Indeksi",
    ticker: "0P0001M5YP.F",
    kind: "fund",
    currency: "EUR",
    account: "AOT",
  },
  {
    match: "käteinen",
    name: "Cash",
    ticker: "CASH",
    kind: "cash",
    currency: "EUR",
    account: "OST",
  },
  {
    match: "cash",
    name: "Cash",
    ticker: "CASH",
    kind: "cash",
    currency: "EUR",
    account: "OST",
  },
];

const FX_PAIR: Record<string, string> = {
  USD: "EURUSD=X",
  NOK: "EURNOK=X",
  SEK: "EURSEK=X",
  GBP: "EURGBP=X",
  DKK: "EURDKK=X",
  CHF: "EURCHF=X",
};

export function hintFromName(name: string): TickerHint | undefined {
  const lower = name.trim().toLowerCase();
  if (!lower) return undefined;
  return TICKER_HINTS.find(
    (hint) => lower.includes(hint.match) || hint.match.includes(lower)
  );
}

export function isCashTicker(ticker: string): boolean {
  return CASH_TICKERS.has(ticker.trim().toUpperCase());
}

export function isValidYahooTicker(ticker: string): boolean {
  return /^[A-Za-z0-9.=^_-]{1,24}$/.test(ticker.trim());
}

export function uniqueQuoteTickers(holdings: PortfolioHolding[]): string[] {
  const seen = new Set<string>();
  for (const row of holdings) {
    const ticker = row.ticker.trim().toUpperCase();
    if (!ticker || isCashTicker(ticker) || row.kind === "cash") continue;
    if (!isValidYahooTicker(ticker)) continue;
    seen.add(ticker);
  }
  return [...seen].slice(0, MAX_QUOTE_TICKERS);
}

export function fxYahooSymbol(currency: string): string | null {
  const ccy = normalizeCurrency(currency);
  if (!ccy || ccy === "EUR") return null;
  return FX_PAIR[ccy] ?? null;
}

export function neededFxCurrencies(quotes: InstrumentQuote[]): string[] {
  const seen = new Set<string>();
  for (const quote of quotes) {
    const ccy = normalizeCurrency(quote.currency);
    if (ccy && ccy !== "EUR") seen.add(ccy);
  }
  return [...seen];
}

export function normalizeCurrency(raw: string | null | undefined): string {
  const ccy = (raw ?? "EUR").trim().toUpperCase();
  if (ccy === "GBX" || ccy === "GBP") return "GBP";
  if (ccy === "GBp") return "GBP";
  return ccy || "EUR";
}

function penceFactor(currency: string | null | undefined): number {
  const raw = (currency ?? "").trim();
  if (raw === "GBp" || raw === "GBX") return 0.01;
  return 1;
}

export function toEurRate(
  currency: string,
  fx: Record<string, FxQuote>
): number {
  const ccy = normalizeCurrency(currency);
  if (ccy === "EUR") return 1;
  const last = fx[ccy]?.last;
  return last != null && last > 0 ? last : 0;
}

function lookupClose(history: QuotePoint[], date: string): number | null {
  let last: number | null = null;
  for (const point of history) {
    if (point.date <= date) last = point.close;
    else break;
  }
  return last;
}

export type ValuedHolding = PortfolioHolding & {
  last: number | null;
  prevClose: number | null;
  quoteCurrency: string;
  fxToEur: number;
  valueEur: number | null;
  prevValueEur: number | null;
  pnlEur: number | null;
  quoteError?: string;
};

export type PortfolioSnapshot = {
  rows: ValuedHolding[];
  totalEur: number;
  prevTotalEur: number;
  dayChangeEur: number;
  dayChangePct: number | null;
  costEur: number;
  pnlEur: number;
  history: QuotePoint[];
  pricedCount: number;
  failedTickers: string[];
};

/** Value change from the first complete history day to current total (Yahoo window, not TWR). */
export function holdingsRangeChange(snapshot: PortfolioSnapshot): {
  eur: number;
  pct: number | null;
} | null {
  const start = snapshot.history[0]?.close;
  if (start == null || start <= 0) return null;
  const eur = snapshot.totalEur - start;
  return { eur, pct: (eur / start) * 100 };
}

export function computePortfolio(
  holdings: PortfolioHolding[],
  quotes: QuotesResponse
): PortfolioSnapshot {
  const byTicker = new Map(
    quotes.quotes.map((q) => [q.ticker.trim().toUpperCase(), q])
  );

  const rows: ValuedHolding[] = holdings.map((holding) => {
    const ticker = holding.ticker.trim().toUpperCase();
    if (holding.kind === "cash" || isCashTicker(ticker)) {
      const value = holding.qty;
      return {
        ...holding,
        last: 1,
        prevClose: 1,
        quoteCurrency: "EUR",
        fxToEur: 1,
        valueEur: value,
        prevValueEur: value,
        pnlEur: value - holding.cost_eur,
      };
    }

    const quote = byTicker.get(ticker);
    const quoteCurrency = quote
      ? normalizeCurrency(quote.currency)
      : normalizeCurrency(holding.currency);
    const factor = penceFactor(quote?.currency);
    const fxToEur = toEurRate(quoteCurrency, quotes.fx);
    const last = quote?.last != null ? quote.last * factor : null;
    const prevClose =
      quote?.prevClose != null ? quote.prevClose * factor : null;
    const valueEur =
      last != null && fxToEur > 0 ? holding.qty * last * fxToEur : null;
    const prevValueEur =
      prevClose != null && fxToEur > 0
        ? holding.qty * prevClose * fxToEur
        : null;

    return {
      ...holding,
      last,
      prevClose,
      quoteCurrency,
      fxToEur,
      valueEur,
      prevValueEur,
      pnlEur: valueEur != null ? valueEur - holding.cost_eur : null,
      quoteError: quote?.error,
    };
  });

  let totalEur = 0;
  let prevTotalEur = 0;
  let costEur = 0;
  let pricedCount = 0;
  const failedTickers: string[] = [];

  for (const row of rows) {
    costEur += row.cost_eur;
    if (row.valueEur != null) {
      totalEur += row.valueEur;
      pricedCount += 1;
      prevTotalEur += row.prevValueEur ?? row.valueEur;
    } else if (row.quoteError) {
      failedTickers.push(row.ticker);
    }
  }

  const dayChangeEur = totalEur - prevTotalEur;
  const dayChangePct =
    prevTotalEur > 0 ? (dayChangeEur / prevTotalEur) * 100 : null;

  return {
    rows,
    totalEur,
    prevTotalEur,
    dayChangeEur,
    dayChangePct,
    costEur,
    pnlEur: totalEur - costEur,
    history: buildValueHistory(rows, quotes),
    pricedCount,
    failedTickers,
  };
}

function buildValueHistory(
  rows: ValuedHolding[],
  quotes: QuotesResponse
): QuotePoint[] {
  const byTicker = new Map(
    quotes.quotes.map((q) => [q.ticker.trim().toUpperCase(), q])
  );
  const dates = new Set<string>();
  for (const quote of quotes.quotes) {
    for (const point of quote.history) dates.add(point.date);
  }
  for (const fx of Object.values(quotes.fx)) {
    for (const point of fx.history) dates.add(point.date);
  }

  const sorted = [...dates].sort();
  const history: QuotePoint[] = [];

  for (const date of sorted) {
    let total = 0;
    let missing = false;
    for (const row of rows) {
      if (row.kind === "cash" || isCashTicker(row.ticker)) {
        total += row.qty;
        continue;
      }
      const quote = byTicker.get(row.ticker.trim().toUpperCase());
      if (!quote || quote.last == null) {
        missing = true;
        break;
      }
      const close = lookupClose(quote.history, date);
      if (close == null) {
        missing = true;
        break;
      }
      const factor = penceFactor(quote.currency);
      const ccy = normalizeCurrency(quote.currency);
      const fxHist = quotes.fx[ccy]?.history ?? [];
      const fxClose =
        ccy === "EUR" ? 1 : lookupClose(fxHist, date) ?? quotes.fx[ccy]?.last;
      if (fxClose == null || fxClose <= 0) {
        missing = true;
        break;
      }
      total += row.qty * close * factor * fxClose;
    }
    if (!missing) history.push({ date, close: total });
  }

  return history;
}

export function formatEur(value: number, decimals = 0): string {
  return `${formatLocaleNumber(value, decimals)} €`;
}

export function formatSignedEur(value: number, decimals = 0): string {
  const abs = formatEur(Math.abs(value), decimals);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

export function allocationByAccount(
  rows: ValuedHolding[]
): { account: HoldingAccount; valueEur: number; pct: number }[] {
  const totals: Record<HoldingAccount, number> = { OST: 0, AOT: 0 };
  let sum = 0;
  for (const row of rows) {
    if (row.valueEur == null) continue;
    totals[row.account] += row.valueEur;
    sum += row.valueEur;
  }
  return (["OST", "AOT"] as const).map((account) => ({
    account,
    valueEur: totals[account],
    pct: sum > 0 ? (totals[account] / sum) * 100 : 0,
  }));
}

export function allocationByKind(
  rows: ValuedHolding[]
): { kind: HoldingKind; valueEur: number; pct: number }[] {
  const totals: Record<HoldingKind, number> = {
    stock: 0,
    fund: 0,
    cash: 0,
  };
  let sum = 0;
  for (const row of rows) {
    if (row.valueEur == null) continue;
    totals[row.kind] += row.valueEur;
    sum += row.valueEur;
  }
  return (["stock", "fund", "cash"] as const).map((kind) => ({
    kind,
    valueEur: totals[kind],
    pct: sum > 0 ? (totals[kind] / sum) * 100 : 0,
  }));
}

/** Optional seed: match known names in pasted Nordnet/PDF text. Qty/cost stay empty. */
export function detectHintsInText(text: string): TickerHint[] {
  const lower = text.toLowerCase();
  const seen = new Set<string>();
  const found: TickerHint[] = [];
  for (const hint of TICKER_HINTS) {
    if (seen.has(hint.ticker)) continue;
    if (lower.includes(hint.match)) {
      seen.add(hint.ticker);
      found.push(hint);
    }
  }
  return found;
}

export const UNIQUE_TICKER_HINTS: TickerHint[] = TICKER_HINTS.filter(
  (hint, index, all) => all.findIndex((h) => h.ticker === hint.ticker) === index
);

export const KIND_LABEL: Record<HoldingKind, string> = {
  stock: "Stock",
  fund: "Fund",
  cash: "Cash",
};
