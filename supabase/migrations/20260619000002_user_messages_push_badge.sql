CREATE TABLE IF NOT EXISTS public."UserMessage" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('VEHICLES', 'REAL_ESTATE', 'SERVICES')),
  "listingId" text REFERENCES public."Listing"(id) ON DELETE CASCADE,
  "serviceProfileId" text REFERENCES public.service_profiles(id) ON DELETE CASCADE,
  "conversationId" uuid REFERENCES public."ListingChatConversation"(id) ON DELETE CASCADE,
  "sourceType" text NOT NULL DEFAULT 'DIRECT' CHECK ("sourceType" IN ('DIRECT', 'CONTACT_LEAD', 'SERVICE_CONTACT', 'LISTING_CHAT')),
  "sourceId" text,
  "senderId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "recipientId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'READ')),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "deliveredAt" timestamptz,
  "readAt" timestamptz,
  CONSTRAINT "UserMessage_target_required"
    CHECK ("listingId" IS NOT NULL OR "serviceProfileId" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "UserMessage_recipient_unread_idx"
  ON public."UserMessage" ("recipientId", category, "createdAt" DESC)
  WHERE "readAt" IS NULL;

CREATE INDEX IF NOT EXISTS "UserMessage_listing_idx"
  ON public."UserMessage" ("listingId");

CREATE INDEX IF NOT EXISTS "UserMessage_serviceProfile_idx"
  ON public."UserMessage" ("serviceProfileId");

CREATE INDEX IF NOT EXISTS "UserMessage_conversation_idx"
  ON public."UserMessage" ("conversationId", "createdAt" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "UserMessage_source_unique_idx"
  ON public."UserMessage" ("sourceType", "sourceId")
  WHERE "sourceId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS public."PushDeliveryLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "messageId" uuid REFERENCES public."UserMessage"(id) ON DELETE SET NULL,
  category text CHECK (category IN ('VEHICLES', 'REAL_ESTATE', 'SERVICES')),
  status text NOT NULL CHECK (status IN ('SENT', 'FAILED', 'SKIPPED', 'NO_TOKENS')),
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "PushDeliveryLog_user_created_idx"
  ON public."PushDeliveryLog" ("userId", "createdAt" DESC);

ALTER TABLE public."UserMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PushDeliveryLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "UserMessage participants can read" ON public."UserMessage";
CREATE POLICY "UserMessage participants can read"
  ON public."UserMessage"
  FOR SELECT
  USING (auth.uid()::text = "senderId" OR auth.uid()::text = "recipientId");

DROP POLICY IF EXISTS "UserMessage sender can insert own message" ON public."UserMessage";
CREATE POLICY "UserMessage sender can insert own message"
  ON public."UserMessage"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "senderId");

DROP POLICY IF EXISTS "UserMessage recipient can mark read" ON public."UserMessage";
CREATE POLICY "UserMessage recipient can mark read"
  ON public."UserMessage"
  FOR UPDATE
  USING (auth.uid()::text = "recipientId")
  WITH CHECK (auth.uid()::text = "recipientId");

DROP POLICY IF EXISTS "PushDeliveryLog owner can read" ON public."PushDeliveryLog";
CREATE POLICY "PushDeliveryLog owner can read"
  ON public."PushDeliveryLog"
  FOR SELECT
  USING (auth.uid()::text = "userId");
