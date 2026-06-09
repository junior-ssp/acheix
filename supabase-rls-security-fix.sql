-- Achei X RLS security fix
-- Goal: remove rls_disabled_in_public without exposing private data.
-- Safe to rerun.

-- 1) Enable RLS on tables reported by Supabase.
ALTER TABLE public.ddds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_profiles ENABLE ROW LEVEL SECURITY;
-- spatial_ref_sys is owned by the PostGIS extension. Supabase/Postgres can reject
-- RLS changes here for non-extension owners. Keep it read-only by grants instead.

-- 2) Remove older policies with the same names before recreating.
DROP POLICY IF EXISTS ddds_public_read ON public.ddds;
DROP POLICY IF EXISTS service_categories_public_read ON public.service_categories;

-- 3) Public reference data: read-only access is fine.
CREATE POLICY ddds_public_read
ON public.ddds
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY service_categories_public_read
ON public.service_categories
FOR SELECT
TO anon, authenticated
USING (true);

-- 4) Sensitive operational tables: no direct public policies.
-- The app uses backend/service_role for these tables, which bypasses RLS.
-- Keeping no anon/authenticated policies prevents direct REST access with the anon key.
REVOKE INSERT, UPDATE, DELETE ON public.ddds FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.service_categories FROM anon, authenticated;
REVOKE ALL ON public.processed_webhooks FROM anon, authenticated;
REVOKE ALL ON public.service_profiles FROM anon, authenticated;

-- 5) Keep backend/service role explicitly privileged.
GRANT SELECT ON public.ddds TO service_role;
GRANT SELECT ON public.service_categories TO service_role;
GRANT ALL ON public.processed_webhooks TO service_role;
GRANT ALL ON public.service_profiles TO service_role;

-- 6) Fix Supabase advisor warning: functions should have fixed search_path.
ALTER FUNCTION public.search_service_profiles_by_radius(double precision, double precision, double precision, text, text, text)
SET search_path = public, pg_temp;

ALTER FUNCTION public.set_service_profile_location()
SET search_path = public, pg_temp;
