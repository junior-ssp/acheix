-- Hardening do cadastro em producao.
-- Mantem User.id como text, mas garante geracao automatica no banco.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public."User"
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN cpf DROP NOT NULL,
  ALTER COLUMN "updatedAt" SET DEFAULT now();

COMMIT;

