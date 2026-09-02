"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";
import { HubBookshelf } from "@/components/hub/HubBookshelf";
import { HubCard } from "@/components/hub/HubCard";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import { STANDARD_BOOK_PAGES } from "@/lib/books";
import { getBookYearStats } from "@/lib/queries";
import { formatLocaleNumber } from "@/lib/utils";

export function HubBooksCard() {
  const { t } = useLocale();
  const booksQuery = useQuery({
    queryKey: ["book-year-stats"],
    queryFn: getBookYearStats,
  });

  const bookStats = booksQuery.data;
  const reading = bookStats?.reading ?? [];
  const finished = bookStats?.finished ?? [];
  const hasBooks = finished.length > 0 || reading.length > 0;

  return (
    <HubCard
      title={t("card.books")}
      footer={
        <Link
          href="/books"
          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
        >
          {t("hub.books.openLog")}
          <ChevronRight className="h-4 w-4" />
        </Link>
      }
    >
      {booksQuery.isError && (
        <QueryErrorBanner
          message={t("hub.books.error")}
          onRetry={() => void booksQuery.refetch()}
        />
      )}
      {booksQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          {t("common.loading")}
        </div>
      )}
      {bookStats && hasBooks && (
        <>
          <p className="text-3xl font-semibold tracking-tight text-zinc-100">
            {bookStats.finishedCount}
          </p>
          <p className="text-sm text-zinc-500">
            {bookStats.finishedCount === 1
              ? t("hub.books.bookThisYear")
              : t("hub.books.booksThisYear")}
          </p>
          {bookStats.pageCount > 0 && (
            <p className="mt-1 text-sm text-zinc-500">
              {bookStats.pageCount} pages · ≈{" "}
              {formatLocaleNumber(bookStats.standardBooks, 1)} of{" "}
              {STANDARD_BOOK_PAGES}-page books
            </p>
          )}
          <HubBookshelf finished={finished} reading={reading} />
          {reading.length > 0 && (
            <ul className="mt-3 space-y-1">
              {reading.slice(0, 3).map((book) => (
                <li key={book.id} className="text-sm text-zinc-300">
                  <span className="text-zinc-500">{t("hub.books.nowReading")} · </span>
                  {book.title}
                  {book.author ? (
                    <span className="text-zinc-500"> · {book.author}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {bookStats && !hasBooks && (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-brand">
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="text-sm text-zinc-500">{t("hub.books.noBooksYet")}</p>
        </div>
      )}
    </HubCard>
  );
}
