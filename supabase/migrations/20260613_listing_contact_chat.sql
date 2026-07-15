ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "allowPublicPhone" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowPublicWhatsapp" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowPublicEmail" boolean NOT NULL DEFAULT false;

ALTER TABLE public."Listing"
  ADD COLUMN IF NOT EXISTS "showEmail" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "retainChatAudit" boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public."ListingChatConversation" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "listingId" text NOT NULL REFERENCES public."Listing"(id) ON DELETE CASCADE,
  "ownerId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "interestedUserId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'OPEN',
  "contentClearedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ListingChatConversation_unique_listing_interested"
    UNIQUE ("listingId", "interestedUserId")
);

CREATE TABLE IF NOT EXISTS public."ListingChatMessage" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" uuid NOT NULL REFERENCES public."ListingChatConversation"(id) ON DELETE CASCADE,
  "senderId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1000),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ListingChatConversation_listingId_idx"
  ON public."ListingChatConversation" ("listingId");

CREATE INDEX IF NOT EXISTS "ListingChatConversation_ownerId_idx"
  ON public."ListingChatConversation" ("ownerId");

CREATE INDEX IF NOT EXISTS "ListingChatMessage_conversationId_createdAt_idx"
  ON public."ListingChatMessage" ("conversationId", "createdAt");
