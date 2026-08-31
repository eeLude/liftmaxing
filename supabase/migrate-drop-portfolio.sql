-- Drop leftover holdings after the portfolio feature was removed.
-- Run once in the Supabase SQL Editor.

drop table if exists portfolio_holdings cascade;
