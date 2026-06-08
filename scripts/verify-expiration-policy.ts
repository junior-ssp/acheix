import assert from "node:assert/strict";
import { planCatalog } from "../src/lib/constants";
import { addDays, getListingDurationDays, recoveryDays, shouldDeleteExpiredListing, shouldExpireListing } from "../src/lib/expiration-policy";

const expectedDurations = {
  FREE: 30,
  BRONZE: 60,
  SILVER: 90,
  GOLD: 120,
  X6: 180,
  X12: 365
} as const;

const createdAt = new Date("2026-01-01T12:00:00.000Z");

for (const [planCode, expectedDays] of Object.entries(expectedDurations)) {
  const plan = planCatalog.find((item) => item.code === planCode);
  assert.equal(plan?.durationDays, expectedDays, `Plano ${planCode} deve ter ${expectedDays} dias no catálogo.`);
  assert.equal(getListingDurationDays({ planCode }), expectedDays, `Fallback do plano ${planCode} deve ser ${expectedDays} dias.`);

  const expiresAt = addDays(createdAt, getListingDurationDays({ plan }));
  const oneMillisecondBeforeExpiration = new Date(expiresAt.getTime() - 1);
  const oneDayAfterExpiration = addDays(expiresAt, 1);

  assert.equal(
    shouldExpireListing({ status: "ACTIVE", expiresAt, expiredNotifiedAt: null }, oneMillisecondBeforeExpiration),
    false,
    `Anúncio ${planCode} não pode expirar antes de completar ${expectedDays} dias.`
  );
  assert.equal(
    shouldExpireListing({ status: "ACTIVE", expiresAt, expiredNotifiedAt: null }, expiresAt),
    true,
    `Anúncio ${planCode} deve expirar ao completar ${expectedDays} dias.`
  );
  assert.equal(
    shouldExpireListing({ status: "ACTIVE", expiresAt, expiredNotifiedAt: null }, oneDayAfterExpiration),
    true,
    `Anúncio ${planCode} ainda deve ser capturado se o job rodar 24h após o vencimento.`
  );
  assert.equal(
    shouldExpireListing({ status: "EXPIRED", expiresAt, expiredNotifiedAt: expiresAt }, oneDayAfterExpiration),
    false,
    `Anúncio ${planCode} já expirado/notificado não deve ser processado novamente.`
  );

  const oneMillisecondBeforeDeletion = new Date(addDays(expiresAt, recoveryDays).getTime() - 1);
  const deletionTime = addDays(expiresAt, recoveryDays);

  assert.equal(
    shouldDeleteExpiredListing({ status: "EXPIRED", expiresAt }, oneMillisecondBeforeDeletion),
    false,
    `Anúncio ${planCode} não pode ser excluído antes dos ${recoveryDays} dias de recuperação.`
  );
  assert.equal(
    shouldDeleteExpiredListing({ status: "EXPIRED", expiresAt }, deletionTime),
    true,
    `Anúncio ${planCode} deve ser excluído ao completar ${recoveryDays} dias de recuperação.`
  );
  assert.equal(
    shouldDeleteExpiredListing({ status: "ACTIVE", expiresAt }, deletionTime),
    false,
    `Anúncio ${planCode} ativo não pode ser excluído automaticamente pela rotina de recuperação.`
  );
}

console.log(`Política de expiração validada: GRÁTIS 30d, BRONZE 60d, PRATA 90d, OURO 120d, X6 180d, X12 365d; anúncios vencem no prazo correto e só são excluídos após ${recoveryDays} dias marcados como expirados.`);
