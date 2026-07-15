CREATE TABLE IF NOT EXISTS public."WantedRequest" (
  id text PRIMARY KEY,
  "ownerId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  "durationDays" integer NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "contactClickCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "WantedRequest_title_length" CHECK (char_length(trim(title)) BETWEEN 4 AND 90),
  CONSTRAINT "WantedRequest_description_length" CHECK (char_length(trim(description)) BETWEEN 10 AND 1200),
  CONSTRAINT "WantedRequest_durationDays_allowed" CHECK ("durationDays" IN (7, 15, 30))
);

CREATE INDEX IF NOT EXISTS "WantedRequest_ownerId_createdAt_idx"
  ON public."WantedRequest" ("ownerId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "WantedRequest_expiresAt_idx"
  ON public."WantedRequest" ("expiresAt");

CREATE INDEX IF NOT EXISTS "WantedRequest_active_idx"
  ON public."WantedRequest" ("expiresAt", "createdAt" DESC);

ALTER TABLE public."WantedRequest" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "WantedRequest service role only" ON public."WantedRequest";
CREATE POLICY "WantedRequest service role only"
  ON public."WantedRequest"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.delete_expired_wanted_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public."WantedRequest"
  WHERE "expiresAt" <= now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_expired_wanted_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_expired_wanted_requests() TO service_role;

CREATE OR REPLACE FUNCTION public.increment_wanted_request_contact_click(_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public."WantedRequest"
  SET "contactClickCount" = "contactClickCount" + 1,
      "updatedAt" = now()
  WHERE id = _id
    AND "expiresAt" > now();
$$;

REVOKE ALL ON FUNCTION public.increment_wanted_request_contact_click(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_wanted_request_contact_click(text) TO service_role;
