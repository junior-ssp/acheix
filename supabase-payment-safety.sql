-- Achei X - Payment safety guards for Supabase/PostgreSQL.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.processed_webhooks (
  id BIGSERIAL PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL UNIQUE,
  provider VARCHAR(40) NOT NULL DEFAULT 'ASAAS',
  payment_id VARCHAR(255),
  provider_payment_id VARCHAR(255),
  event_name VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_payment_id
  ON public.processed_webhooks(payment_id);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_provider_payment_id
  ON public.processed_webhooks(provider_payment_id);

ALTER TABLE public."Payment"
  ADD COLUMN IF NOT EXISTS "asaasPaymentId" VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_unique_asaas_payment_id
  ON public."Payment" ("asaasPaymentId")
  WHERE "asaasPaymentId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_unique_payment_id
  ON public."Subscription" ("paymentId")
  WHERE "paymentId" IS NOT NULL;
