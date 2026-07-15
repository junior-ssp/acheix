CREATE TABLE IF NOT EXISTS public."Product" (
  id text PRIMARY KEY,
  "listingId" text NOT NULL REFERENCES public."Listing"(id) ON DELETE CASCADE,
  "productCategory" text NOT NULL,
  subcategory text NOT NULL,
  condition text NOT NULL CHECK (condition IN ('Novo', 'Usado', 'Recondicionado', 'Lacrado')),
  brand text NULL,
  model text NULL,
  "serialOrImei" text NULL,
  "originProofUrls" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "originDeclarationAccepted" boolean NOT NULL DEFAULT false,
  "reviewedAt" timestamptz NULL,
  "reviewedById" text NULL REFERENCES public."User"(id) ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Product_listing_unique" UNIQUE ("listingId"),
  CONSTRAINT "Product_origin_proof_required" CHECK (jsonb_array_length("originProofUrls") BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS "Product_listingId_idx" ON public."Product" ("listingId");
CREATE INDEX IF NOT EXISTS "Product_category_subcategory_idx" ON public."Product" ("productCategory", subcategory);

ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Product public active listing read" ON public."Product";
CREATE POLICY "Product public active listing read"
  ON public."Product" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public."Listing" l
      WHERE l.id = "Product"."listingId"
        AND l.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Product owner read own" ON public."Product";
CREATE POLICY "Product owner read own"
  ON public."Product" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."Listing" l
      JOIN public."User" u ON u.id = l."ownerId"
      WHERE l.id = "Product"."listingId"
        AND u.email = auth.email()
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserMessage_category_check') THEN
    ALTER TABLE public."UserMessage" DROP CONSTRAINT "UserMessage_category_check";
  END IF;
  ALTER TABLE public."UserMessage"
    ADD CONSTRAINT "UserMessage_category_check"
    CHECK (category IN ('VEHICLES', 'REAL_ESTATE', 'SERVICES', 'PRODUCTS'));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushNotificationLog_category_check') THEN
    ALTER TABLE public."PushNotificationLog" DROP CONSTRAINT "PushNotificationLog_category_check";
  END IF;
  ALTER TABLE public."PushNotificationLog"
    ADD CONSTRAINT "PushNotificationLog_category_check"
    CHECK (category IN ('VEHICLES', 'REAL_ESTATE', 'SERVICES', 'PRODUCTS'));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;