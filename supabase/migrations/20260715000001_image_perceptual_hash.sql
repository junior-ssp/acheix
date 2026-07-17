ALTER TABLE public."ImageModerationLog"
  ADD COLUMN IF NOT EXISTS "perceptualHash" text;

CREATE INDEX IF NOT EXISTS "ImageModerationLog_perceptual_hash_status_idx"
  ON public."ImageModerationLog" ("perceptualHash", status)
  WHERE "perceptualHash" IS NOT NULL;
