# Achei X Classificados


## Rodar localmente

1. Instale dependências: `npm install`
2. Copie `.env.example` para `.env`
3. Configure `DATABASE_URL` e `JWT_SECRET`
6. Inicie: `npm run dev`

## Usar Supabase como banco


```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres"
```

Use `DATABASE_URL` com a conexão pooled para o app e `DIRECT_URL` com a conexão direta para migrations. Depois execute:

```bash
```

### Upload de fotos com Supabase Storage

Crie um bucket público chamado `listing-photos`, execute `supabase-storage-policies.sql` no SQL Editor e configure:

```env
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET="listing-photos"
```

## Rotina de expiração

Configure um cron externo para executar diariamente:

```bash
npm run jobs:expire-listings
```

As rotas e telas usam dados reais do banco. Com o banco vazio, a aplicação mostra estados vazios em vez de dados mockados.

## Funcionalidades implementadas

- Categorias restritas a veículos e imóveis.
- Planos GRÁTIS, BRONZE, PRATA e OURO com validade e limite de fotos.
- Cadastro com CPF, e-mail, senha e dados opcionais.
- Login JWT em cookie HTTP-only.
- Privacidade de telefone e WhatsApp por anúncio.
- Contato visível apenas para usuários logados.
- Busca global por texto indexado do anúncio.
- Favoritos sincronizados por usuario.
- Compartilhamento com link único por anúncio.
- Dashboard do anunciante e painel administrativo.
- Rotina de aviso e remoção de anúncios expirados.

