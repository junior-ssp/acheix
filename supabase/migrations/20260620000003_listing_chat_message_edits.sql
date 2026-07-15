DO $migration$
BEGIN
  EXECUTE 'ALTER TABLE public."ListingChatMessage" ADD COLUMN IF NOT EXISTS "editedAt" timestamptz';
END
$migration$;
