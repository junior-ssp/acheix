ALTER TABLE public."ManualListing"
  DROP CONSTRAINT IF EXISTS "ManualListing_category_allowed";

ALTER TABLE public."ManualListing"
  ADD CONSTRAINT "ManualListing_category_allowed"
  CHECK (category IN ('VEHICLE', 'REAL_ESTATE', 'COMPANY', 'SERVICE', 'PRODUCT'));
