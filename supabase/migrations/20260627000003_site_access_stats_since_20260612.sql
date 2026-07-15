CREATE OR REPLACE FUNCTION public.admin_site_access_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH br_states(state_code, state_name) AS (
    VALUES
      ('AC', 'Acre'),
      ('AL', 'Alagoas'),
      ('AP', 'Amapá'),
      ('AM', 'Amazonas'),
      ('BA', 'Bahia'),
      ('CE', 'Ceará'),
      ('DF', 'Distrito Federal'),
      ('ES', 'Espírito Santo'),
      ('GO', 'Goiás'),
      ('MA', 'Maranhão'),
      ('MT', 'Mato Grosso'),
      ('MS', 'Mato Grosso do Sul'),
      ('MG', 'Minas Gerais'),
      ('PA', 'Pará'),
      ('PB', 'Paraíba'),
      ('PR', 'Paraná'),
      ('PE', 'Pernambuco'),
      ('PI', 'Piauí'),
      ('RJ', 'Rio de Janeiro'),
      ('RN', 'Rio Grande do Norte'),
      ('RS', 'Rio Grande do Sul'),
      ('RO', 'Rondônia'),
      ('RR', 'Roraima'),
      ('SC', 'Santa Catarina'),
      ('SP', 'São Paulo'),
      ('SE', 'Sergipe'),
      ('TO', 'Tocantins')
  ),
  counted_logs AS (
    SELECT *
    FROM public.site_access_logs
    WHERE created_at >= '2026-06-12 00:00:00-03'::timestamptz
  ),
  total AS (
    SELECT COUNT(*)::bigint AS total_count
    FROM counted_logs
  ),
  state_counts AS (
    SELECT UPPER(state_code) AS state_code, COUNT(*)::bigint AS access_count
    FROM counted_logs
    WHERE UPPER(COALESCE(country, '')) = 'BR'
      AND state_code IS NOT NULL
    GROUP BY UPPER(state_code)
  ),
  state_rows AS (
    SELECT
      s.state_code,
      s.state_name,
      COALESCE(c.access_count, 0)::bigint AS access_count,
      CASE
        WHEN total.total_count = 0 THEN 0
        ELSE ROUND((COALESCE(c.access_count, 0)::numeric * 100) / total.total_count, 2)
      END AS percentage
    FROM br_states s
    CROSS JOIN total
    LEFT JOIN state_counts c ON c.state_code = s.state_code
  ),
  top_state AS (
    SELECT state_code, state_name, access_count, percentage
    FROM state_rows
    WHERE access_count > 0
    ORDER BY access_count DESC, state_name ASC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'periodStart', '2026-06-12T03:00:00.000Z',
    'periodLabel', 'Desde 12/06/2026',
    'total', (SELECT total_count FROM total),
    'statesWithAccess', (SELECT COUNT(*) FROM state_rows WHERE access_count > 0),
    'topState', COALESCE((SELECT to_jsonb(top_state) FROM top_state), 'null'::jsonb),
    'states', COALESCE((
      SELECT jsonb_agg(to_jsonb(state_rows) ORDER BY access_count DESC, state_name ASC)
      FROM state_rows
    ), '[]'::jsonb)
  )
$function$;

REVOKE ALL ON FUNCTION public.admin_site_access_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_site_access_stats() FROM anon;
REVOKE ALL ON FUNCTION public.admin_site_access_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_site_access_stats() TO service_role;
