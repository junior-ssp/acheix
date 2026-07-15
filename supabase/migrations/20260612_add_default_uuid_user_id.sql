-- Migration: 2026-06-12
-- Purpose: Ensure "User"."id" uses gen_random_uuid() as DEFAULT and fill NULLs.
-- Safe path: only runs when the column type is already `uuid`.

BEGIN;

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  typ text;
BEGIN
  SELECT data_type INTO typ
  FROM information_schema.columns
  WHERE table_name = 'User' AND column_name = 'id';

  IF NOT FOUND THEN
    RAISE NOTICE 'Table "User" or column "id" not found. Skipping migration.';
  ELSIF typ IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'User.id is of type %; this migration only supports columns already typed as uuid.\nFor integer/serial primary keys create a migration that adds a new uuid column, migrates references, then swaps PKs.', typ;
  ELSE
    -- Populate any NULL ids with a generated uuid
    EXECUTE 'UPDATE "User" SET id = gen_random_uuid() WHERE id IS NULL';

    -- Set default to gen_random_uuid()
    EXECUTE 'ALTER TABLE "User" ALTER COLUMN id SET DEFAULT gen_random_uuid()';

    RAISE NOTICE 'Applied gen_random_uuid() default and populated NULL ids for "User".';
  END IF;
END$$;

COMMIT;

-- Verification queries (for operator):
-- SELECT column_default FROM information_schema.columns WHERE table_name='User' AND column_name='id';
-- SELECT count(*) FROM "User" WHERE id IS NULL;
