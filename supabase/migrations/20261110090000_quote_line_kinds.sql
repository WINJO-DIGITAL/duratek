-- More kinds of quote line for full job costing. Own migration: Postgres
-- cannot use a new enum value in the transaction that adds it.
alter type public.quote_line_kind add value if not exists 'underlay';
alter type public.quote_line_kind add value if not exists 'trim';
alter type public.quote_line_kind add value if not exists 'adhesive';
alter type public.quote_line_kind add value if not exists 'delivery';
alter type public.quote_line_kind add value if not exists 'expense';
