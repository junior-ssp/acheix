ALTER TYPE public."PlanCode" ADD VALUE IF NOT EXISTS 'PRODUCT_MINI';
ALTER TYPE public."PlanCode" ADD VALUE IF NOT EXISTS 'PRODUCT_START';
ALTER TYPE public."PlanCode" ADD VALUE IF NOT EXISTS 'PRODUCT_BASIC';

INSERT INTO public."Plan" (
  id,
  code,
  name,
  "priceCents",
  "durationDays",
  "photoLimit",
  "listingLimit",
  active
)
VALUES
  ('plan_product_mini', 'PRODUCT_MINI', 'MINI', 199, 30, 3, 1, true),
  ('plan_product_start', 'PRODUCT_START', 'START', 299, 30, 3, 1, true),
  ('plan_product_basic', 'PRODUCT_BASIC', U&'B\00C1SICO', 499, 30, 3, 1, true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  "priceCents" = EXCLUDED."priceCents",
  "durationDays" = EXCLUDED."durationDays",
  "photoLimit" = EXCLUDED."photoLimit",
  "listingLimit" = EXCLUDED."listingLimit",
  active = true;
