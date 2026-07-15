CREATE TABLE IF NOT EXISTS public."CpfChangeRequest" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "currentCpf" text,
  "requestedCpf" text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING_REVIEW',
  "documentUrl" text NOT NULL,
  "selfieUrl" text NOT NULL,
  "documentOcrText" text,
  "documentOcrProvider" text,
  "ocrCpfMatched" boolean,
  "reviewedBy" text REFERENCES public."User"(id) ON DELETE SET NULL,
  "reviewedAt" timestamptz,
  "reviewNote" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cpf_change_request_user_idx
  ON public."CpfChangeRequest" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS cpf_change_request_status_idx
  ON public."CpfChangeRequest" (status, "createdAt" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS cpf_change_request_one_pending_per_user_idx
  ON public."CpfChangeRequest" ("userId")
  WHERE status = 'PENDING_REVIEW';
