DO $migration$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "ListingChatConversation interested insert" ON public."ListingChatConversation"';
  EXECUTE 'CREATE POLICY "ListingChatConversation interested insert"
    ON public."ListingChatConversation"
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public."User" u
        WHERE u."supabaseUid"::text = auth.uid()::text
          AND u.id = "ListingChatConversation"."interestedUserId"
      )
      AND EXISTS (
        SELECT 1 FROM public."Listing" l
        WHERE l.id = "ListingChatConversation"."listingId"
          AND l."ownerId" = "ListingChatConversation"."ownerId"
          AND l.status = ''ACTIVE''
      )
    )';
END
$migration$;
