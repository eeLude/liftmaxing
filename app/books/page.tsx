"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useLocale } from "@/components/LocaleProvider";
import { MobileLayout } from "@/components/MobileLayout";
import { QueryErrorBanner } from "@/components/LoadingStates";
import { computeBookYearStats, formatBookYearLine } from "@/lib/books";
import { formatFiDate, toDateString } from "@/lib/dates";
import {
  deleteBook,
  getBooks,
  upsertBook,
  type BookInput,
} from "@/lib/queries";
import { parseLocaleNumber } from "@/lib/utils";
import type { Book, BookStatus } from "@/types/database";

type FormState = {
  id?: string;
  title: string;
  author: string;
  status: BookStatus;
  started_on: string;
  finished_on: string;
  page_count: string;
  rating: string;
  note: string;
};

const emptyForm = (): FormState => ({
  title: "",
  author: "",
  status: "reading",
  started_on: "",
  finished_on: "",
  page_count: "",
  rating: "",
  note: "",
});

function bookToForm(book: Book): FormState {
  return {
    id: book.id,
    title: book.title,
    author: book.author ?? "",
    status: book.status,
    started_on: book.started_on ?? "",
    finished_on: book.finished_on ?? "",
    page_count: book.page_count != null ? String(book.page_count) : "",
    rating: book.rating != null ? String(book.rating) : "",
    note: book.note ?? "",
  };
}

function formToInput(form: FormState): BookInput {
  const pages = form.page_count ? parseLocaleNumber(form.page_count) : null;
  const rating = form.rating ? Number(form.rating) : null;
  return {
    id: form.id,
    title: form.title,
    author: form.author || null,
    status: form.status,
    started_on: form.started_on || null,
    finished_on: form.finished_on || null,
    page_count:
      pages != null && pages > 0 ? Math.round(pages) : null,
    rating:
      rating != null && rating >= 1 && rating <= 5 ? rating : null,
    note: form.note || null,
  };
}

export default function BooksPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: getBooks,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const invalidateBooks = () => {
    queryClient.invalidateQueries({ queryKey: ["books"] });
    queryClient.invalidateQueries({ queryKey: ["book-year-stats"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => upsertBook(formToInput(form)),
    onSuccess: () => {
      invalidateBooks();
      setFormOpen(false);
      setForm(emptyForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBook(id),
    onSuccess: () => {
      invalidateBooks();
      setDeleteId(null);
      setFormOpen(false);
      setForm(emptyForm());
    },
  });

  const books = booksQuery.data ?? [];
  const stats = useMemo(() => computeBookYearStats(books), [books]);
  const finished = useMemo(() => {
    const yearPrefix = String(stats.year);
    const thisYear: Book[] = [];
    const earlier: Book[] = [];
    for (const book of books) {
      if (book.status !== "finished") continue;
      if (book.finished_on?.startsWith(yearPrefix)) thisYear.push(book);
      else earlier.push(book);
    }
    const byFinished = (a: Book, b: Book) =>
      (b.finished_on ?? "").localeCompare(a.finished_on ?? "");
    thisYear.sort(byFinished);
    earlier.sort(byFinished);
    return { thisYear, earlier };
  }, [books, stats.year]);

  const openNew = () => {
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (book: Book) => {
    setForm(bookToForm(book));
    setFormOpen(true);
  };

  const setStatus = (status: BookStatus) => {
    setForm((prev) => ({
      ...prev,
      status,
      finished_on:
        status === "finished"
          ? prev.finished_on || toDateString(new Date())
          : "",
    }));
  };

  return (
    <MobileLayout>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{t("books.title")}</h1>
          <p className="text-sm text-zinc-400">{t("books.subtitle")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LocaleToggle />
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {t("books.addShort")}
          </button>
        </div>
      </header>

      {booksQuery.isError && (
        <QueryErrorBanner
          message={t("books.error")}
          onRetry={() => void booksQuery.refetch()}
        />
      )}

      <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          This year
        </h2>
        <p className="mt-2 text-lg font-semibold text-zinc-100">
          {formatBookYearLine(stats)}
        </p>
      </section>

      {formOpen && (
        <form
          className="mb-4 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <h2 className="text-sm font-medium text-zinc-300">
            {form.id ? "Edit book" : "Add book"}
          </h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              Title
            </span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-zinc-700 px-4 py-3"
              placeholder="Book title"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              Author
            </span>
            <input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              className="w-full rounded-xl border border-zinc-700 px-4 py-3"
              placeholder="Optional"
            />
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              Status
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["reading", "finished"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatus(status)}
                  className={`rounded-xl border py-2.5 text-sm font-medium capitalize ${
                    form.status === status
                      ? "border-brand bg-brand text-white"
                      : "border-zinc-700 text-zinc-300"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-300">
                Started
              </span>
              <input
                type="date"
                value={form.started_on}
                onChange={(e) =>
                  setForm({ ...form, started_on: e.target.value })
                }
                className="w-full rounded-xl border border-zinc-700 px-3 py-3"
              />
            </label>
            {form.status === "finished" && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Finished
                </span>
                <input
                  type="date"
                  value={form.finished_on}
                  onChange={(e) =>
                    setForm({ ...form, finished_on: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-700 px-3 py-3"
                />
              </label>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-300">
                Pages
              </span>
              <input
                inputMode="numeric"
                value={form.page_count}
                onChange={(e) =>
                  setForm({ ...form, page_count: e.target.value })
                }
                className="w-full rounded-xl border border-zinc-700 px-4 py-3"
                placeholder="e.g. 320"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-300">
                Rating
              </span>
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3"
              >
                <option value="">None</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">
              Note
            </span>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-zinc-700 px-4 py-3"
              placeholder="Optional"
            />
          </label>
          {saveMutation.isError && (
            <p className="text-sm text-red-400">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : "Could not save. Run supabase/migrate-books.sql if the table is missing."}
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
              onClick={() => setDeleteId(form.id!)}
              className="w-full py-2 text-sm text-red-400"
            >
              Delete book
            </button>
          )}
        </form>
      )}

      {!booksQuery.isLoading && books.length === 0 && !formOpen && (
        <p className="mb-4 text-sm text-zinc-500">
          Add a book you&apos;ve read or started.
        </p>
      )}

      {stats.reading.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Reading
          </h2>
          <ul className="space-y-2">
            {stats.reading.map((book) => (
              <BookRow key={book.id} book={book} onEdit={() => openEdit(book)} />
            ))}
          </ul>
        </section>
      )}

      {finished.thisYear.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Finished {stats.year}
          </h2>
          <ul className="space-y-2">
            {finished.thisYear.map((book) => (
              <BookRow key={book.id} book={book} onEdit={() => openEdit(book)} />
            ))}
          </ul>
        </section>
      )}

      {finished.earlier.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Earlier
          </h2>
          <ul className="space-y-2">
            {finished.earlier.map((book) => (
              <BookRow key={book.id} book={book} onEdit={() => openEdit(book)} />
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={deleteId != null}
        title="Delete this book?"
        message="This removes it from your reading log."
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

function BookRow({ book, onEdit }: { book: Book; onEdit: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onEdit}
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left hover:border-zinc-600"
      >
        <p className="font-medium text-zinc-100">{book.title}</p>
        {book.author && (
          <p className="mt-0.5 text-sm text-zinc-400">{book.author}</p>
        )}
        <p className="mt-1 text-xs text-zinc-500">
          {book.status === "finished" && book.finished_on
            ? formatFiDate(book.finished_on)
            : book.started_on
              ? `Started ${formatFiDate(book.started_on)}`
              : "In progress"}
          {book.page_count != null ? ` · ${book.page_count} pages` : ""}
          {book.rating != null ? ` · ${book.rating}/5` : ""}
        </p>
        {book.note && (
          <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{book.note}</p>
        )}
      </button>
    </li>
  );
}
