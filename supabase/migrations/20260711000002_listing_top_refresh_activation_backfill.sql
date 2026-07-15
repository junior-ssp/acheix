CREATE INDEX IF NOT EXISTS "Listing_active_category_top_refresh_idx"
  ON public."Listing" (category, "lastTopRefreshAt" DESC, "createdAt" DESC)
  WHERE status = 'ACTIVE';

UPDATE public."Listing" listing
SET
  "lastTopRefreshAt" = COALESCE(listing."lastTopRefreshAt", listing."createdAt", listing."updatedAt", now()),
  "nextTopRefreshAt" = COALESCE(listing."nextTopRefreshAt", now() + (random() * interval '24 hours')),
  "updatedAt" = now()
FROM public."Plan" plan
WHERE listing."planId" = plan.id
  AND listing.status = 'ACTIVE'
  AND listing."expiresAt" > now()
  AND (
    listing."lastTopRefreshAt" IS NULL
    OR listing."nextTopRefreshAt" IS NULL
  );
