ALTER TABLE public."ManualListing"
  ADD COLUMN IF NOT EXISTS "priceCents" integer;

ALTER TABLE public."ManualListing"
  DROP CONSTRAINT IF EXISTS "ManualListing_priceCents_nonnegative";

ALTER TABLE public."ManualListing"
  ADD CONSTRAINT "ManualListing_priceCents_nonnegative"
  CHECK ("priceCents" IS NULL OR "priceCents" >= 0);
