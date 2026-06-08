# Supabase Storage Setup

1. No Supabase, abra o projeto.
2. Va em Storage e crie um bucket publico chamado `listing-photos`.
3. No SQL Editor, execute o arquivo `supabase-storage-policies.sql`.
4. Copie `Project URL` e `anon public key` em Project Settings > API.
5. Preencha no `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET="listing-photos"
SUPABASE_SERVICE_ROLE_KEY=""
```

6. Reinicie o app.

```bash
npm run dev
```

O upload do formulario de anuncio passara a enviar as imagens para Supabase Storage e gravar as URLs publicas no anuncio.
