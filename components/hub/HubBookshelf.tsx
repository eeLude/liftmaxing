import { STANDARD_BOOK_PAGES } from "@/lib/books";
import type { Book } from "@/types/database";

const SPINE_COLORS = [
  "from-[#003acc] to-[#004cff]",
  "from-indigo-950 to-indigo-700",
  "from-amber-950 to-amber-700",
  "from-emerald-950 to-emerald-700",
  "from-rose-950 to-rose-800",
  "from-sky-950 to-sky-700",
  "from-violet-950 to-violet-700",
  "from-zinc-800 to-zinc-600",
];

function spineHeight(pages: number | null): number {
  const n = pages && pages > 0 ? pages : STANDARD_BOOK_PAGES;
  return 56 + Math.min(40, (n / 900) * 40);
}

function spineLabel(title: string): string {
  return title.length > 18 ? `${title.slice(0, 16)}…` : title;
}

function bookTitle(book: Book): string {
  return [
    book.title,
    book.author,
    book.page_count != null ? `${book.page_count} pages` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Spine({
  book,
  color,
  reading,
}: {
  book: Book;
  color: string;
  reading?: boolean;
}) {
  return (
    <div
      title={bookTitle(book)}
      className={`relative shrink-0 overflow-hidden rounded-t-[4px] bg-gradient-to-br shadow-[inset_-2px_0_0_rgba(0,0,0,0.25)] ${color} ${
        reading ? "w-7 ring-1 ring-zinc-200/50" : "w-6"
      }`}
      style={{ height: spineHeight(book.page_count), minWidth: reading ? 28 : 24 }}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/25" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/35" />
      <span
        className="absolute bottom-1.5 left-1/2 z-10 max-h-[88%] -translate-x-1/2 overflow-hidden text-[8px] font-semibold uppercase leading-none tracking-wide text-white/90"
        style={{ writingMode: "vertical-rl" }}
      >
        {spineLabel(book.title)}
      </span>
    </div>
  );
}

export function HubBookshelf({
  finished,
  reading,
}: {
  finished: Book[];
  reading: Book[];
}) {
  if (finished.length === 0 && reading.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl bg-zinc-950/60 px-2.5 pt-3">
      <div
        className="flex min-h-[6.5rem] flex-wrap items-end gap-0.5"
        aria-label="All finished books"
      >
        {finished.map((book, i) => (
          <Spine
            key={book.id}
            book={book}
            color={SPINE_COLORS[i % SPINE_COLORS.length]}
          />
        ))}
        {reading.map((book, i) => (
          <Spine
            key={book.id}
            book={book}
            color={SPINE_COLORS[(finished.length + i) % SPINE_COLORS.length]}
            reading
          />
        ))}
      </div>
      <div className="mt-0.5 h-2 rounded-sm bg-gradient-to-b from-zinc-600 to-zinc-800" />
    </div>
  );
}
