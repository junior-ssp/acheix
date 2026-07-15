DO $$
BEGIN
  -- Supabase/PostGIS may own this extension table as supabase_admin.
  -- If the migration role cannot alter it, keep the migration non-breaking and
  -- apply the same statements manually from the Supabase SQL editor/admin role.
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
