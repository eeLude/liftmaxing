import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  fxYahooSymbol,
  isValidYahooTicker,
  MAX_QUOTE_TICKERS,
  neededFxCurrencies,
  parseYahooRange,
  QUOTE_STALE_MS,
  type FxQuote,
  type InstrumentQuote,
  type QuotePoint,
  type QuotesResponse,
  type YahooRange,
} from "@/lib/portfolio";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

const YAHOO_TIMEOUT_MS = 8_000;
const ERROR_CACHE_MS = 30_000;
const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        symbol?: string;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }>;
    error?: { description?: string };
  };
};

type ParsedChart = {
  currency: string;
  last: number | null;
  prevClose: number | null;
  history: QuotePoint[];
};

type CacheEntry = { at: number; ttl: number; value: ParsedChart | { error: string } };

const chartCache = new Map<string, CacheEntry>();

function supabaseForUser(accessToken: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

function parseTickers(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const ticker = part.trim().toUpperCase();
    if (!ticker || !isValidYahooTicker(ticker) || seen.has(ticker)) continue;
    seen.add(ticker);
    out.push(ticker);
    if (out.length >= MAX_QUOTE_TICKERS) break;
  }
  return out;
}

function isoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

function parseYahoo(data: YahooChart): ParsedChart | { error: string } {
  const err = data.chart?.error?.description;
  const result = data.chart?.result?.[0];
  if (err || !result) {
    return { error: err ?? "No Yahoo data." };
  }

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const history: QuotePoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close)) continue;
    history.push({ date: isoDate(timestamps[i]), close });
  }

  const lastClose = history.at(-1)?.close ?? null;
  const last = result.meta?.regularMarketPrice ?? lastClose;
  const prevClose =
    result.meta?.chartPreviousClose ??
    result.meta?.previousClose ??
    (history.length >= 2 ? history[history.length - 2].close : lastClose);

  return {
    currency: result.meta?.currency ?? "EUR",
    last: last != null && Number.isFinite(last) ? last : null,
    prevClose: prevClose != null && Number.isFinite(prevClose) ? prevClose : null,
    history,
  };
}

async function fetchYahooChart(
  symbol: string,
  range: YahooRange
): Promise<ParsedChart | { error: string }> {
  const cacheKey = `${symbol}|${range}`;
  const cached = chartCache.get(cacheKey);
  if (cached && Date.now() - cached.at < cached.ttl) {
    return cached.value;
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(YAHOO_TIMEOUT_MS),
      headers: {
        "User-Agent": YAHOO_UA,
        Accept: "application/json",
        Referer: "https://finance.yahoo.com/",
      },
    });
    if (!res.ok) {
      const value = { error: `Yahoo ${res.status}` };
      chartCache.set(cacheKey, { at: Date.now(), ttl: ERROR_CACHE_MS, value });
      return value;
    }
    const data = (await res.json()) as YahooChart;
    const value = parseYahoo(data);
    const ttl = "error" in value ? ERROR_CACHE_MS : QUOTE_STALE_MS;
    chartCache.set(cacheKey, { at: Date.now(), ttl, value });
    return value;
  } catch {
    const value = { error: "Yahoo request failed." };
    chartCache.set(cacheKey, { at: Date.now(), ttl: ERROR_CACHE_MS, value });
    return value;
  }
}

function isError(value: ParsedChart | { error: string }): value is { error: string } {
  return "error" in value;
}

function toEurFx(parsed: ParsedChart): FxQuote | null {
  if (parsed.last == null || parsed.last <= 0) return null;
  const invert = (n: number) => 1 / n;
  return {
    last: invert(parsed.last),
    history: parsed.history
      .filter((p) => p.close > 0)
      .map((p) => ({ date: p.date, close: invert(p.close) })),
  };
}

export async function GET(request: NextRequest) {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = supabaseForUser(jwt);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const tickers = parseTickers(request.nextUrl.searchParams.get("tickers"));
  const range = parseYahooRange(request.nextUrl.searchParams.get("range"));
  const charts = await Promise.all(
    tickers.map(async (ticker) => {
      const parsed = await fetchYahooChart(ticker, range);
      if (isError(parsed)) {
        return {
          ticker,
          currency: "EUR",
          last: null,
          prevClose: null,
          history: [],
          error: parsed.error,
        } satisfies InstrumentQuote;
      }
      return {
        ticker,
        currency: parsed.currency,
        last: parsed.last,
        prevClose: parsed.prevClose,
        history: parsed.history,
      } satisfies InstrumentQuote;
    })
  );

  const fx: Record<string, FxQuote> = {
    EUR: { last: 1, history: [] },
  };

  const fxCurrencies = neededFxCurrencies(charts);
  await Promise.all(
    fxCurrencies.map(async (ccy) => {
      const symbol = fxYahooSymbol(ccy);
      if (!symbol) return;
      const parsed = await fetchYahooChart(symbol, range);
      if (isError(parsed)) return;
      const converted = toEurFx(parsed);
      if (converted) fx[ccy] = converted;
    })
  );

  const body: QuotesResponse = { quotes: charts, fx };
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, max-age=900",
    },
  });
}
