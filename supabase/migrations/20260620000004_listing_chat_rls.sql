DO $migration$
BEGIN
  EXECUTE 'ALTER TABLE public."ListingChatConversation" ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public."ListingChatMessage" ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "ListingChatConversation participants select" ON public."ListingChatConversation"';
  EXECUTE 'CREATE POLICY "ListingChatConversation participants select"
    ON public."ListingChatConversation" FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public."User" u
      WHERE u."supabaseUid"::text = auth.uid()::text
        AND u.id IN ("ownerId", "interestedUserId")
    ))';

  EXECUTE 'DROP POLICY IF EXISTS "ListingChatConversation interested insert" ON public."ListingChatConversation"';
  EXECUTE 'CREATE POLICY "ListingChatConversation interested insert"
    ON public."ListingChatConversation" FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM public."User" u WHERE u."supabaseUid"::text = auth.uid()::text AND u.id = "interestedUserId")
      AND EXISTS (SELECT 1 FROM public."Listing" l WHERE l.id = "listingId" AND l."ownerId" = "ownerId")
    )';

  EXECUTE 'DROP POLICY IF EXISTS "ListingChatMessage participants select" ON public."ListingChatMessage"';
  EXECUTE 'CREATE POLICY "ListingChatMessage participants select"
    ON public."ListingChatMessage" FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public."ListingChatConversation" c
      JOIN public."User" u ON u.id IN (c."ownerId", c."interestedUserId")
      WHERE c.id = "conversationId" AND u."supabaseUid"::text = auth.uid()::text
    ))';

  EXECUTE 'DROP POLICY IF EXISTS "ListingChatMessage participant insert" ON public."ListingChatMessage"';
  EXECUTE 'CREATE POLICY "ListingChatMessage participant insert"
    ON public."ListingChatMessage" FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM public."User" u WHERE u."supabaseUid"::text = auth.uid()::text AND u.id = "senderId")
      AND EXISTS (
        SELECT 1 FROM public."ListingChatConversation" c
        WHERE c.id = "conversationId" AND "senderId" IN (c."ownerId", c."interestedUserId")
      )
    )';
END
$migration$;
