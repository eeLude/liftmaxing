import type { Book } from "@/types/database";
import { formatLocaleNumber } from "@/lib/utils";

export const STANDARD_BOOK_PAGES = 350;

export type BookYearStats = {
  year: number;
  finishedCount: number;
  pageCount: number;
  standardBooks: number;
  reading: Book[];
  /** All finished books, oldest first — used by the hub shelf. */
  finished: Book[];
};

export function currentCalendarYear(from: Date = new Date()): number {
  return from.getFullYear();
}

export function pagesToStandardBooks(pageCount: number): number {
  if (pageCount <= 0) return 0;
  return Math.round((pageCount / STANDARD_BOOK_PAGES) * 10) / 10;
}

export function formatBookYearLine(stats: BookYearStats): string {
  const books = `${stats.finishedCount} book${stats.finishedCount === 1 ? "" : "s"}`;
  if (stats.pageCount <= 0) return books;
  const equiv = formatLocaleNumber(pagesToStandardBooks(stats.pageCount), 1);
  return `${books} · ${stats.pageCount} pages · ≈ ${equiv} of ${STANDARD_BOOK_PAGES}-page books`;
}

export function computeBookYearStats(
  books: Book[],
  year: number = currentCalendarYear()
): BookYearStats {
  const yearPrefix = String(year);
  const finishedThisYear = books.filter(
    (b) =>
      b.status === "finished" &&
      b.finished_on != null &&
      b.finished_on.startsWith(yearPrefix)
  );

  const pageCount = finishedThisYear.reduce(
    (sum, b) => sum + (b.page_count ?? 0),
    0
  );

  return {
    year,
    finishedCount: finishedThisYear.length,
    pageCount,
    standardBooks: pagesToStandardBooks(pageCount),
    finished: books
      .filter((b) => b.status === "finished")
      .sort((a, b) => (a.finished_on ?? "").localeCompare(b.finished_on ?? "")),
    reading: books
      .filter((b) => b.status === "reading")
      .sort((a, b) => (b.started_on ?? "").localeCompare(a.started_on ?? "")),
  };
}
