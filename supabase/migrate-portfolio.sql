-- Portfolio holdings (quantities + cost). Prices come from Yahoo, not this table.
-- Run once in the Supabase SQL Editor. Do not put real positions in git.

create table if not exists portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  ticker text not null,
  kind text not null check (kind in ('stock', 'fund', 'cash')),
  account text not null check (account in ('OST', 'AOT')),
  qty numeric(14, 6) not null check (qty >= 0),
  cost_eur numeric(14, 2) not null default 0,
  currency text not null default 'EUR',
  created_at timestamptz not null default now()
);

create index if not exists portfolio_holdings_user_idx
  on portfolio_holdings (user_id, created_at desc);

alter table portfolio_holdings enable row level security;

drop policy if exists "users_own_portfolio_holdings" on portfolio_holdings;

create policy "users_own_portfolio_holdings" on portfolio_holdings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
