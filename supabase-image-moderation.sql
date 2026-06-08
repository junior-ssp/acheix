-- Achei X - Image moderation audit tables.
-- Run this in the Supabase SQL Editor before enforcing production image moderation.

CREATE TABLE IF NOT EXISTS public."ImageModerationLog" (
  id UUID PRIMARY KEY,
  "userId" UUID REFERENCES public."User"(id) ON DELETE SET NULL,
  url TEXT,
  "storagePath" TEXT,
  "imageHash" VARCHAR(64) NOT NULL,
  status VARCHAR(30) NOT NULL,
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "riskLevel" VARCHAR(20) NOT NULL DEFAULT 'LOW',
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  "ocrText" TEXT,
  provider VARCHAR(80),
  "providerRaw" JSONB,
  ip VARCHAR(120),
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_moderation_user_status
  ON public."ImageModerationLog" ("userId", status);

CREATE INDEX IF NOT EXISTS idx_image_moderation_hash
  ON public."ImageModerationLog" ("imageHash");

CREATE INDEX IF NOT EXISTS idx_image_moderation_created
  ON public."ImageModerationLog" ("createdAt");

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "imageRiskScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "imageModerationBlockedAt" TIMESTAMPTZ;
