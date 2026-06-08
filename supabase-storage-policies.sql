-- Execute no SQL Editor do Supabase.
-- Cria um bucket publico para fotos de anuncios.
-- Pode rodar mais de uma vez sem duplicar bucket/policy.

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read listing photos" on storage.objects;

create policy "Public read listing photos"
on storage.objects
for select
to public
using (bucket_id = 'listing-photos');

-- Uploads sao feitos pelo backend do app usando service role key.
-- Por isso nao criamos policy publica de insert/update/delete.
