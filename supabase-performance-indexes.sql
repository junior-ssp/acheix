-- Achei X performance indexes
-- Run in Supabase SQL Editor. Safe to rerun: every index uses IF NOT EXISTS.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Listings: home, category pages, search, detail, owner dashboard and expiration jobs.
CREATE INDEX IF NOT EXISTS idx_listing_status_category_created_at
ON "Listing" ("status", "category", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_listing_status_type_created_at
ON "Listing" ("status", "type", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_listing_status_location_created_at
ON "Listing" ("status", "state", "city", "district", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_listing_owner_status_expires_at
ON "Listing" ("ownerId", "status", "expiresAt");

CREATE INDEX IF NOT EXISTS idx_listing_owner_plan_created_at
ON "Listing" ("ownerId", "planId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_listing_price_created_at
ON "Listing" ("priceCents", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_listing_expires_at
ON "Listing" ("expiresAt");

CREATE INDEX IF NOT EXISTS idx_listing_slug
ON "Listing" ("slug");

CREATE INDEX IF NOT EXISTS idx_listing_search_text_trgm
ON "Listing" USING GIN ("searchText" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_listing_city_trgm
ON "Listing" USING GIN ("city" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_listing_district_trgm
ON "Listing" USING GIN ("district" gin_trgm_ops);

-- Listing hydration.
CREATE INDEX IF NOT EXISTS idx_photo_listing_order
ON "Photo" ("listingId", "order");

CREATE INDEX IF NOT EXISTS idx_vehicle_listing
ON "Vehicle" ("listingId");

CREATE INDEX IF NOT EXISTS idx_vehicle_brand_model_year
ON "Vehicle" ("brand", "model", "year");

CREATE INDEX IF NOT EXISTS idx_real_estate_listing
ON "RealEstate" ("listingId");

CREATE INDEX IF NOT EXISTS idx_real_estate_filters
ON "RealEstate" ("purpose", "bedrooms", "bathrooms", "parking", "areaM2");

-- Service providers: service search and billing/activity jobs.
CREATE INDEX IF NOT EXISTS idx_service_profiles_active_status_location
ON service_profiles (active, status, estado, cidade, bairro);

CREATE INDEX IF NOT EXISTS idx_service_profiles_category
ON service_profiles (categoria_servico);

CREATE INDEX IF NOT EXISTS idx_service_profiles_categories_gin
ON service_profiles USING GIN (categorias_servico);

CREATE INDEX IF NOT EXISTS idx_service_profiles_search_text_trgm
ON service_profiles USING GIN (search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_service_profiles_cep
ON service_profiles (cep);

CREATE INDEX IF NOT EXISTS idx_service_profiles_user_status
ON service_profiles (user_id, status, active);

CREATE INDEX IF NOT EXISTS idx_service_profiles_activity_due
ON service_profiles (activity_confirmation_due_at, status, active);

-- Payments and user-facing account pages.
CREATE INDEX IF NOT EXISTS idx_payment_user_status_created_at
ON "Payment" ("userId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_payment_provider_ref
ON "Payment" ("providerRef");

CREATE INDEX IF NOT EXISTS idx_contact_lead_listing_created_at
ON "ContactLead" ("listingId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_service_contact_profile_created_at
ON "ServiceContact" ("profileId", "createdAt" DESC);

