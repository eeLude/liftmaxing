"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-950 px-4 text-zinc-400">
      <p className="text-sm">{error.message || "Something went wrong."}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
      >
        Try again
      </button>
    </div>
  );
}
