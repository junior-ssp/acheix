-- Teste de cooldown de anúncio GRÁTIS
-- Uso: substitua :USER_ID e :CATEGORY e execute no Supabase SQL Editor.

-- 1) Quantos anúncios grátis desta categoria o usuário publicou nos últimos 90 dias?
SELECT count(*) AS recent_free_count
FROM "Listing"
WHERE "ownerId" = ':USER_ID'
  AND "category" = ':CATEGORY'
  AND "planId" IN (SELECT id FROM "Plan" WHERE code = 'FREE')
  AND "createdAt" >= (now() - interval '90 days');

-- 2) Se recent_free_count > 0 então a criação de um novo anúncio grátis será bloqueada pelo backend.
-- 3) Para inspecionar os anúncios recentes:
SELECT id, title, createdAt, expiresAt, status
FROM "Listing"
WHERE "ownerId" = ':USER_ID'
  AND "category" = ':CATEGORY'
  AND "planId" IN (SELECT id FROM "Plan" WHERE code = 'FREE')
ORDER BY createdAt DESC
LIMIT 20;

-- Nota: substitua ':USER_ID' pelo id real do usuário (coloque o valor entre aspas simples). Ex:
-- WHERE "ownerId" = 'b1a2c3d4-...'
