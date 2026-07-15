CREATE TABLE IF NOT EXISTS public."SupportRequest" (
  id text PRIMARY KEY,
  "userId" text NULL REFERENCES public."User"(id) ON DELETE SET NULL,
  name text NOT NULL,
  username text NULL,
  email text NOT NULL,
  phone text NULL,
  whatsapp text NULL,
  category text NOT NULL DEFAULT 'SUPORTE',
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  source text NOT NULL DEFAULT 'APP',
  "userAgent" text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SupportRequest_createdAt_idx"
  ON public."SupportRequest" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SupportRequest_status_createdAt_idx"
  ON public."SupportRequest" (status, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SupportRequest_userId_createdAt_idx"
  ON public."SupportRequest" ("userId", "createdAt" DESC);
