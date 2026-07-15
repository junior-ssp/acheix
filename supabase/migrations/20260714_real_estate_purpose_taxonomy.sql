ALTER TABLE public."RealEstate" ADD COLUMN IF NOT EXISTS "maxGuests" integer;
ALTER TABLE public."RealEstate" ALTER COLUMN purpose DROP NOT NULL;

UPDATE public."RealEstate" SET purpose = CASE
  WHEN upper(trim(coalesce(purpose, ''))) IN ('SALE', 'VENDA') THEN 'SALE'
  WHEN upper(trim(coalesce(purpose, ''))) IN ('RENT', 'LOCAÇÃO', 'LOCACAO', 'ALUGUEL') THEN 'RENT'
  WHEN upper(trim(coalesce(purpose, ''))) IN ('SEASON', 'TEMPORADA') THEN 'SEASON'
  ELSE NULL END;

ALTER TABLE public."RealEstate" DROP CONSTRAINT IF EXISTS "RealEstate_purpose_allowed";
ALTER TABLE public."RealEstate" ADD CONSTRAINT "RealEstate_purpose_allowed" CHECK (purpose IS NULL OR purpose IN ('SALE', 'RENT', 'SEASON')) NOT VALID;
ALTER TABLE public."RealEstate" VALIDATE CONSTRAINT "RealEstate_purpose_allowed";
ALTER TABLE public."RealEstate" DROP CONSTRAINT IF EXISTS "RealEstate_maxGuests_positive";
ALTER TABLE public."RealEstate" ADD CONSTRAINT "RealEstate_maxGuests_positive" CHECK ("maxGuests" IS NULL OR "maxGuests" > 0) NOT VALID;
ALTER TABLE public."RealEstate" VALIDATE CONSTRAINT "RealEstate_maxGuests_positive";
CREATE INDEX IF NOT EXISTS "RealEstate_purpose_idx" ON public."RealEstate" (purpose);
