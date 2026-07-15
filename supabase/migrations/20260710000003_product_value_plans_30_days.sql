UPDATE public."Plan"
SET "durationDays" = 30,
    "photoLimit" = 3,
    "listingLimit" = 1,
    "priceCents" = CASE code
      WHEN 'PRODUCT_MINI' THEN 199
      WHEN 'PRODUCT_START' THEN 299
      WHEN 'PRODUCT_BASIC' THEN 499
      ELSE "priceCents"
    END,
    active = true
WHERE code IN ('PRODUCT_MINI', 'PRODUCT_START', 'PRODUCT_BASIC');
