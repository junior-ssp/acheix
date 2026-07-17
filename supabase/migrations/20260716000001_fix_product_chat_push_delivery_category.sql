DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushDeliveryLog_category_check') THEN
    ALTER TABLE public."PushDeliveryLog" DROP CONSTRAINT "PushDeliveryLog_category_check";
  END IF;
  ALTER TABLE public."PushDeliveryLog"
    ADD CONSTRAINT "PushDeliveryLog_category_check"
    CHECK (category IN ('VEHICLES', 'REAL_ESTATE', 'SERVICES', 'PRODUCTS'));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
