-- Add multi-currency support to cash_flow_entries
-- entered_currency: the currency the user typed in (e.g. CAD, USD, EUR)
-- entered_amount:   the raw amount the user typed (before CHF conversion)
-- amount stays in CHF base for aggregation

alter table cash_flow_entries
  add column if not exists entered_currency text default 'CHF',
  add column if not exists entered_amount numeric;
