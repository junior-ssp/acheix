import assert from "node:assert/strict";
import { planCatalog } from "../src/lib/constants";
import { addDays, getListingDurationDays, recoveryDays, shouldDeleteExpiredListing, shouldExpireListing } from "../src/lib/expiration-policy";
import { getTopRefreshIntervalDays, listingTopRefreshActivationFields, shouldApplyTopRefreshBoost, topRefreshBoostUntil } from "../src/lib/listing-top-refresh-policy";

const expectedDurations = {
  FREE: 90,
  PRODUCT_MINI: 30,
  PRODUCT_START: 30,
  PRODUCT_BASIC: 30,
  BRONZE: 60,
  SILVER: 90,
  GOLD: 120,
  X6: 180,
  X12: 365
} as const;

const expectedTopRefreshIntervals = {
  FREE: 7,
  PRODUCT_MINI: 3,
  PRODUCT_START: 3,
  PRODUCT_BASIC: 3,
  BRONZE: 5,
  SILVER: 3,
  GOLD: 2,
  X6: 1,
  X12: 1
} as const;

const createdAt = new Date("2026-01-01T12:00:00.000Z");

for (const [planCode, expectedDays] of Object.entries(expectedDurations)) {
  const plan = planCatalog.find((item) => item.code === planCode);
  assert.equal(plan?.durationDays, expectedDays, `Plan ${planCode} must have ${expectedDays} days in the catalog.`);
  assert.equal(getListingDurationDays({ planCode }), expectedDays, `Plan ${planCode} fallback must have ${expectedDays} days.`);

  const expiresAt = addDays(createdAt, getListingDurationDays({ plan }));
  const oneMillisecondBeforeExpiration = new Date(expiresAt.getTime() - 1);
  const oneDayAfterExpiration = addDays(expiresAt, 1);

  assert.equal(
    shouldExpireListing({ status: "ACTIVE", expiresAt, expiredNotifiedAt: null }, oneMillisecondBeforeExpiration),
    false,
    `Listing ${planCode} cannot expire before ${expectedDays} days.`
  );
  assert.equal(
    shouldExpireListing({ status: "ACTIVE", expiresAt, expiredNotifiedAt: null }, expiresAt),
    true,
    `Listing ${planCode} must expire after ${expectedDays} days.`
  );
  assert.equal(
    shouldExpireListing({ status: "ACTIVE", expiresAt, expiredNotifiedAt: null }, oneDayAfterExpiration),
    true,
    `Listing ${planCode} must still be caught if the job runs 24h after expiration.`
  );
  assert.equal(
    shouldExpireListing({ status: "EXPIRED", expiresAt, expiredNotifiedAt: expiresAt }, oneDayAfterExpiration),
    false,
    `Listing ${planCode} already expired/notified cannot be processed again.`
  );

  const oneMillisecondBeforeDeletion = new Date(addDays(expiresAt, recoveryDays).getTime() - 1);
  const deletionTime = addDays(expiresAt, recoveryDays);

  assert.equal(
    shouldDeleteExpiredListing({ status: "EXPIRED", expiresAt }, oneMillisecondBeforeDeletion),
    false,
    `Listing ${planCode} cannot be deleted before ${recoveryDays} recovery days.`
  );
  assert.equal(
    shouldDeleteExpiredListing({ status: "EXPIRED", expiresAt }, deletionTime),
    true,
    `Listing ${planCode} must be deleted after ${recoveryDays} recovery days.`
  );
  assert.equal(
    shouldDeleteExpiredListing({ status: "ACTIVE", expiresAt }, deletionTime),
    false,
    `Active listing ${planCode} cannot be deleted by the recovery routine.`
  );
}

for (const [planCode, expectedDays] of Object.entries(expectedTopRefreshIntervals)) {
  assert.equal(getTopRefreshIntervalDays(planCode), expectedDays, `Plan ${planCode} top refresh interval must be ${expectedDays} days.`);
}

const boostStart = new Date("2026-01-01T12:00:00.000Z");
const boostUntil = topRefreshBoostUntil(boostStart);
assert.equal(shouldApplyTopRefreshBoost({ topRefreshBoostUntil: boostUntil }, boostStart), true, "Top refresh boost must be active before expiration.");
assert.equal(shouldApplyTopRefreshBoost({ topRefreshBoostUntil: boostUntil }, addDays(boostStart, 1)), false, "Top refresh boost must expire automatically.");

const activationFields = listingTopRefreshActivationFields("BRONZE", boostStart);
assert.equal(activationFields.lastTopRefreshAt, boostStart.toISOString(), "Activated listing must start with a top refresh timestamp.");
assert.equal(activationFields.nextTopRefreshAt, addDays(boostStart, expectedTopRefreshIntervals.BRONZE).toISOString(), "Activated listing must schedule the next top refresh from activation.");
assert.equal(shouldApplyTopRefreshBoost({ topRefreshBoostUntil: activationFields.topRefreshBoostUntil }, boostStart), true, "Activated listing must receive an initial top boost.");

console.log(`Policy validated: product value plans use 30 days, 3-day top refresh and deletion only after ${recoveryDays} recovery days.`);
