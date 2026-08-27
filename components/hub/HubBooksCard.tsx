"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HubCard } from "@/components/hub/HubCard";
import {
  LoadingSpinner,
  QueryErrorBanner,
} from "@/components/LoadingStates";
import { formatBookYearLine } from "@/lib/books";
import { getBookYearStats } from "@/lib/queries";

export function HubBooksCard() {
  const booksQuery = useQuery({
    queryKey: ["book-year-stats"],
    queryFn: getBookYearStats,
  });

  const bookStats = booksQuery.data;
  const reading = bookStats?.reading ?? [];

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
        <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner className="h-4 w-4" />
          Loading…
        </div>
      )}
      {bookStats ? (
        <p className="text-lg font-semibold text-zinc-100">
          {formatBookYearLine(bookStats)}
          <span className="block text-sm font-normal text-zinc-500">
            in {bookStats.year}
          </span>
        </p>
      ) : (
        !booksQuery.isLoading && (
          <p className="text-sm text-zinc-500">No reading data yet</p>
        )
      )}
      {reading.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {reading.slice(0, 3).map((book) => (
            <li key={book.id} className="text-sm text-zinc-300">
              {book.title}
              {book.author ? (
                <span className="text-zinc-500"> · {book.author}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        !booksQuery.isLoading && (
          <p className="mt-2 text-sm text-zinc-500">Nothing in progress</p>
        )
      )}
    </HubCard>
  );
}
