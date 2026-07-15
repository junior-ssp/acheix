ALTER TABLE public."AdminPlanGrant" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AdminPlanGrant service role only" ON public."AdminPlanGrant";
CREATE POLICY "AdminPlanGrant service role only"
  ON public."AdminPlanGrant"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM authenticated;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM PUBLIC;

DO $$
BEGIN
  ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "spatial_ref_sys public read only" ON public.spatial_ref_sys;
  CREATE POLICY "spatial_ref_sys public read only"
    ON public.spatial_ref_sys
    FOR SELECT
    USING (true);
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not enable RLS on public.spatial_ref_sys because the current role is not the table owner.';
END $$;
