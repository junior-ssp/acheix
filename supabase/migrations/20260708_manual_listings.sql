ALTER TABLE public."WantedRequest"
  DROP CONSTRAINT IF EXISTS "WantedRequest_title_length",
  DROP CONSTRAINT IF EXISTS "WantedRequest_description_length";

ALTER TABLE public."WantedRequest"
  ADD CONSTRAINT "WantedRequest_title_length" CHECK (char_length(trim(title)) >= 1),
  ADD CONSTRAINT "WantedRequest_description_length" CHECK (char_length(trim(description)) >= 1);

CREATE TABLE IF NOT EXISTS public."ManualListing" (
  id text PRIMARY KEY,
  "ownerId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  title text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  website text,
  facebook text,
  instagram text,
  youtube text,
  tiktok text,
  category text NOT NULL,
  "durationDays" integer NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "contactClickCount" integer NOT NULL DEFAULT 0,
  "lastTopRefreshAt" timestamptz,
  "nextTopRefreshAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ManualListing_title_length" CHECK (char_length(trim(title)) >= 1),
  CONSTRAINT "ManualListing_address_length" CHECK (char_length(trim(address)) >= 1),
  CONSTRAINT "ManualListing_phone_length" CHECK (char_length(trim(phone)) >= 1),
  CONSTRAINT "ManualListing_category_allowed" CHECK (category IN ('VEHICLE', 'REAL_ESTATE', 'COMPANY', 'SERVICE')),
  CONSTRAINT "ManualListing_durationDays_allowed" CHECK ("durationDays" IN (7, 15, 30, 90, 180, 365))
);

ALTER TABLE public."ManualListing"
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS youtube text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS whatsapp text;

CREATE TABLE IF NOT EXISTS public."ManualListingPhoto" (
  id text PRIMARY KEY,
  "manualListingId" text NOT NULL REFERENCES public."ManualListing"(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  "order" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ManualListing_ownerId_createdAt_idx"
  ON public."ManualListing" ("ownerId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ManualListing_active_category_idx"
  ON public."ManualListing" (category, "expiresAt", "lastTopRefreshAt" DESC, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ManualListing_expiresAt_idx"
  ON public."ManualListing" ("expiresAt");

CREATE INDEX IF NOT EXISTS "ManualListingPhoto_listing_order_idx"
  ON public."ManualListingPhoto" ("manualListingId", "order");

ALTER TABLE public."ManualListing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ManualListingPhoto" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ManualListing service role only" ON public."ManualListing";
CREATE POLICY "ManualListing service role only"
  ON public."ManualListing"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "ManualListingPhoto service role only" ON public."ManualListingPhoto";
CREATE POLICY "ManualListingPhoto service role only"
  ON public."ManualListingPhoto"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.delete_expired_manual_listings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public."ManualListing"
  WHERE "expiresAt" <= now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_expired_manual_listings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_expired_manual_listings() TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_manual_listing_top_positions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public."ManualListing"
  SET "lastTopRefreshAt" = now(),
      "nextTopRefreshAt" = now() + interval '7 days',
      "updatedAt" = now()
  WHERE "expiresAt" > now()
    AND "nextTopRefreshAt" <= now();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_manual_listing_top_positions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_manual_listing_top_positions() TO service_role;
