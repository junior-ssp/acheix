ALTER TABLE public."ManualListing"
  ADD COLUMN IF NOT EXISTS "tollFree" text,
  ADD COLUMN IF NOT EXISTS vidiu text;
