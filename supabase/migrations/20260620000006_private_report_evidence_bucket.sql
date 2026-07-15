DO $migration$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'report-evidence',
    'report-evidence',
    false,
    26214400,
    ARRAY['image/*', 'video/*']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  EXECUTE 'DROP POLICY IF EXISTS "Public read report evidence" ON storage.objects';
END
$migration$;
