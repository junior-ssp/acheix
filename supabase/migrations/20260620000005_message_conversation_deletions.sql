DO $migration$
BEGIN
  EXECUTE 'CREATE TABLE IF NOT EXISTS public."MessageConversationDeletion" (
    "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    "conversationKey" text NOT NULL,
    "deletedAt" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("userId", "conversationKey")
  )';
  EXECUTE 'CREATE INDEX IF NOT EXISTS "MessageConversationDeletion_user_idx"
    ON public."MessageConversationDeletion" ("userId", "deletedAt" DESC)';
  EXECUTE 'ALTER TABLE public."MessageConversationDeletion" ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS "MessageConversationDeletion owner access" ON public."MessageConversationDeletion"';
  EXECUTE 'CREATE POLICY "MessageConversationDeletion owner access"
    ON public."MessageConversationDeletion"
    FOR ALL
    USING (auth.uid()::text = "userId")
    WITH CHECK (auth.uid()::text = "userId")';
END
$migration$;
