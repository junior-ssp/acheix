ALTER TABLE public."Listing"
  ADD COLUMN IF NOT EXISTS "nextTopRefreshAt" timestamptz NULL,
  ADD COLUMN IF NOT EXISTS "lastTopRefreshAt" timestamptz NULL,
  ADD COLUMN IF NOT EXISTS "topRefreshBoostUntil" timestamptz NULL;

CREATE INDEX IF NOT EXISTS "Listing_top_refresh_due_idx"
  ON public."Listing" ("status", "nextTopRefreshAt")
  WHERE "nextTopRefreshAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Listing_owner_last_top_refresh_idx"
  ON public."Listing" ("ownerId", "lastTopRefreshAt" DESC)
  WHERE "lastTopRefreshAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Listing_top_refresh_boost_idx"
  ON public."Listing" ("topRefreshBoostUntil" DESC)
  WHERE "topRefreshBoostUntil" IS NOT NULL;

UPDATE public."Listing" listing
SET "nextTopRefreshAt" = now() + (random() * interval '24 hours')
FROM public."Plan" plan
WHERE listing."planId" = plan.id
  AND listing.status = 'ACTIVE'
  AND listing."expiresAt" > now()
  AND listing."nextTopRefreshAt" IS NULL;
