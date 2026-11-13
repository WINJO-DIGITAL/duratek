-- Accounts can be suspended (temporarily removed from trade access without
-- rejecting the application). Own migration: Postgres cannot use a new enum
-- value in the transaction that adds it.
alter type public.profile_status add value if not exists 'suspended';
