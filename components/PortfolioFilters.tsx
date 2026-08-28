"use client";

import { ACCOUNT_FILTERS, type AccountFilter } from "@/lib/portfolio";

export function PortfolioFilters({
  account,
  onAccount,
}: {
  account: AccountFilter;
  onAccount: (value: AccountFilter) => void;
}) {
  return (
    <div className="flex rounded-lg bg-zinc-800 p-0.5">
      {ACCOUNT_FILTERS.map((item) => {
        const active = item.id === account;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onAccount(item.id)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium ${
              active
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
