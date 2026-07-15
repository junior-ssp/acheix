CREATE TABLE IF NOT EXISTS public.site_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  page_path text NOT NULL,
  ip_hash text NOT NULL,
  user_agent text NULL,
  state_code text NULL,
  state_name text NULL,
  city text NULL,
  country text NULL,
  dedupe_key text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS site_access_logs_dedupe_key_idx
ON public.site_access_logs (dedupe_key);

CREATE INDEX IF NOT EXISTS site_access_logs_created_at_idx
ON public.site_access_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS site_access_logs_state_code_idx
ON public.site_access_logs (state_code);

ALTER TABLE public.site_access_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.site_access_logs FROM PUBLIC;
REVOKE ALL ON public.site_access_logs FROM anon;
REVOKE ALL ON public.site_access_logs FROM authenticated;
GRANT SELECT, INSERT ON public.site_access_logs TO service_role;

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
  total AS (
    SELECT COUNT(*)::bigint AS total_count
    FROM public.site_access_logs
  ),
  state_counts AS (
    SELECT UPPER(state_code) AS state_code, COUNT(*)::bigint AS access_count
    FROM public.site_access_logs
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
