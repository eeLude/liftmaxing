"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
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
      title="Books"
      footer={
        <Link
          href="/books"
          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500"
        >
          Open reading log
          <ChevronRight className="h-4 w-4" />
        </Link>
      }
    >
      {booksQuery.isError && (
        <QueryErrorBanner
          message="Could not load books."
          onRetry={() => void booksQuery.refetch()}
        />
      )}
      {booksQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}
      {bookStats && hasBooks && (
        <>
          <p className="text-3xl font-semibold tracking-tight text-zinc-100">
            {bookStats.finishedCount}
          </p>
          <p className="text-sm text-zinc-500">
            book{bookStats.finishedCount === 1 ? "" : "s"} this year
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
                  <span className="text-zinc-500">Now · </span>
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
          <p className="text-sm text-zinc-500">No books logged yet</p>
        </div>
      )}
    </HubCard>
  );
}
