CREATE OR REPLACE FUNCTION public.admin_system_capacity_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT jsonb_build_object(
    'databaseBytes', pg_database_size(current_database()),
    'storageBytes', COALESCE((
      SELECT SUM(
        CASE
          WHEN COALESCE(o.metadata ->> 'size', '') ~ '^[0-9]+$'
            THEN (o.metadata ->> 'size')::bigint
          ELSE 0
        END
      )
      FROM storage.objects o
    ), 0),
    'fileCount', (SELECT COUNT(*) FROM storage.objects),
    'imageCount', (
      SELECT COUNT(*)
      FROM storage.objects o
      WHERE LOWER(COALESCE(o.metadata ->> 'mimetype', '')) LIKE 'image/%'
    ),
    'bucketCount', (SELECT COUNT(*) FROM storage.buckets),
    'bucketNames', COALESCE((SELECT jsonb_agg(b.id ORDER BY b.id) FROM storage.buckets b), '[]'::jsonb)
  )
$function$;

REVOKE ALL ON FUNCTION public.admin_system_capacity_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_system_capacity_stats() FROM anon;
REVOKE ALL ON FUNCTION public.admin_system_capacity_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_system_capacity_stats() TO service_role;
