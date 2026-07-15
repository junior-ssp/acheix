DO $migration$
BEGIN
  EXECUTE 'CREATE OR REPLACE FUNCTION public.current_app_user_id()
    RETURNS text
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''''
    AS $function$
      SELECT u.id
      FROM public."User" u
      WHERE u."supabaseUid"::text = auth.uid()::text
      LIMIT 1
    $function$';
  EXECUTE 'REVOKE ALL ON FUNCTION public.current_app_user_id() FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.current_app_user_id() FROM anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated';

  EXECUTE 'DROP POLICY IF EXISTS "MessageConversationDeletion owner access" ON public."MessageConversationDeletion"';
  EXECUTE 'CREATE POLICY "MessageConversationDeletion owner access"
    ON public."MessageConversationDeletion" FOR ALL TO authenticated
    USING ("userId" = public.current_app_user_id())
    WITH CHECK ("userId" = public.current_app_user_id())';

  EXECUTE 'DROP POLICY IF EXISTS "PushDeliveryLog owner can read" ON public."PushDeliveryLog"';
  EXECUTE 'CREATE POLICY "PushDeliveryLog owner can read"
    ON public."PushDeliveryLog" FOR SELECT TO authenticated
    USING ("userId" = public.current_app_user_id())';

  EXECUTE 'DROP POLICY IF EXISTS "UserMessage participants can read" ON public."UserMessage"';
  EXECUTE 'CREATE POLICY "UserMessage participants can read"
    ON public."UserMessage" FOR SELECT TO authenticated
    USING (public.current_app_user_id() IN ("senderId", "recipientId"))';
  EXECUTE 'DROP POLICY IF EXISTS "UserMessage sender can insert own message" ON public."UserMessage"';
  EXECUTE 'CREATE POLICY "UserMessage sender can insert own message"
    ON public."UserMessage" FOR INSERT TO authenticated
    WITH CHECK ("senderId" = public.current_app_user_id())';
  EXECUTE 'DROP POLICY IF EXISTS "UserMessage recipient can mark read" ON public."UserMessage"';
  EXECUTE 'CREATE POLICY "UserMessage recipient can mark read"
    ON public."UserMessage" FOR UPDATE TO authenticated
    USING ("recipientId" = public.current_app_user_id())
    WITH CHECK ("recipientId" = public.current_app_user_id())';

  EXECUTE 'DROP POLICY IF EXISTS "ListingChatConversation participants select" ON public."ListingChatConversation"';
  EXECUTE 'CREATE POLICY "ListingChatConversation participants select"
    ON public."ListingChatConversation" FOR SELECT TO authenticated
    USING (public.current_app_user_id() IN ("ownerId", "interestedUserId"))';
  EXECUTE 'DROP POLICY IF EXISTS "ListingChatConversation interested insert" ON public."ListingChatConversation"';
  EXECUTE 'CREATE POLICY "ListingChatConversation interested insert"
    ON public."ListingChatConversation" FOR INSERT TO authenticated
    WITH CHECK (
      "interestedUserId" = public.current_app_user_id()
      AND EXISTS (
        SELECT 1 FROM public."Listing" l
        WHERE l.id = "ListingChatConversation"."listingId"
          AND l."ownerId" = "ListingChatConversation"."ownerId"
          AND l.status = ''ACTIVE''
      )
    )';

  EXECUTE 'DROP POLICY IF EXISTS "ListingChatMessage participants select" ON public."ListingChatMessage"';
  EXECUTE 'CREATE POLICY "ListingChatMessage participants select"
    ON public."ListingChatMessage" FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public."ListingChatConversation" c
      WHERE c.id = "ListingChatMessage"."conversationId"
        AND public.current_app_user_id() IN (c."ownerId", c."interestedUserId")
    ))';
  EXECUTE 'DROP POLICY IF EXISTS "ListingChatMessage participant insert" ON public."ListingChatMessage"';
  EXECUTE 'CREATE POLICY "ListingChatMessage participant insert"
    ON public."ListingChatMessage" FOR INSERT TO authenticated
    WITH CHECK (
      "senderId" = public.current_app_user_id()
      AND EXISTS (
        SELECT 1 FROM public."ListingChatConversation" c
        WHERE c.id = "ListingChatMessage"."conversationId"
          AND "ListingChatMessage"."senderId" IN (c."ownerId", c."interestedUserId")
      )
    )';
END
$migration$;
