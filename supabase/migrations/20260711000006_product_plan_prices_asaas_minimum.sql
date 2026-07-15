-- Ajusta os planos de produtos ao minimo real aceito pelo Asaas para PIX.
-- Mantem duracao/fotos/regras, altera apenas valores e pagamentos pendentes.

UPDATE public."Plan"
SET "priceCents" = CASE code
  WHEN 'PRODUCT_MINI' THEN 500
  WHEN 'PRODUCT_START' THEN 699
  WHEN 'PRODUCT_BASIC' THEN 899
  ELSE "priceCents"
END
WHERE code IN ('PRODUCT_MINI', 'PRODUCT_START', 'PRODUCT_BASIC');

UPDATE public."Payment"
SET "amountCents" = CASE
  WHEN "providerRef" LIKE '%:PRODUCT_MINI:%' OR "providerRef" LIKE '%:PRODUCT_MINI' THEN 500
  WHEN "providerRef" LIKE '%:PRODUCT_START:%' OR "providerRef" LIKE '%:PRODUCT_START' THEN 699
  WHEN "providerRef" LIKE '%:PRODUCT_BASIC:%' OR "providerRef" LIKE '%:PRODUCT_BASIC' THEN 899
  ELSE "amountCents"
END,
"updatedAt" = now()
WHERE status = 'PENDING'
  AND (
    "providerRef" LIKE '%:PRODUCT_MINI:%'
    OR "providerRef" LIKE '%:PRODUCT_MINI'
    OR "providerRef" LIKE '%:PRODUCT_START:%'
    OR "providerRef" LIKE '%:PRODUCT_START'
    OR "providerRef" LIKE '%:PRODUCT_BASIC:%'
    OR "providerRef" LIKE '%:PRODUCT_BASIC'
  );
