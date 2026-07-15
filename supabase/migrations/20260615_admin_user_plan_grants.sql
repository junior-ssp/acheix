CREATE TABLE IF NOT EXISTS public."AdminPlanGrant" (
  id text PRIMARY KEY,
  "adminId" text NOT NULL REFERENCES public."User"(id) ON DELETE RESTRICT,
  "targetUserId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "previousPlanId" text NULL REFERENCES public."Plan"(id) ON DELETE SET NULL,
  "newPlanId" text NOT NULL REFERENCES public."Plan"(id) ON DELETE RESTRICT,
  "durationPreset" text NOT NULL,
  "startsAt" timestamptz NOT NULL,
  "endsAt" timestamptz NOT NULL,
  reason text NOT NULL,
  "affectedListingIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "skippedListingIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "AdminPlanGrant_targetUserId_createdAt_idx"
  ON public."AdminPlanGrant" ("targetUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AdminPlanGrant_adminId_createdAt_idx"
  ON public."AdminPlanGrant" ("adminId", "createdAt" DESC);
