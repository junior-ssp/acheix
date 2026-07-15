#!/usr/bin/env tsx
// prefer loading .env via require if dotenv is available in devDependencies
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
} catch (e) {
  // ignore if dotenv not installed; assume environment variables are set
}
import { db, newDbId } from "../src/lib/supabase-db";

async function main() {
  try {
    // Find user by name 'Junior' (case-insensitive)
    const { data: users, error: userError } = await db()
      .from("User")
      .select("id,name,email")
      .ilike("name", "%junior%")
      .limit(1);
    if (userError) throw userError;
    const user = (users as any[] | null)?.[0];
    if (!user) {
      console.error("Usuário 'Junior' não encontrado.");
      process.exitCode = 2;
      return;
    }

    // Find FREE plan id
    const { data: planRows, error: planError } = await db().from("Plan").select("id,code,durationDays,priceCents").eq("code", "FREE").maybeSingle();
    if (planError) throw planError;
    const plan = planRows as any | null;
    if (!plan) {
      console.error("Plano FREE não encontrado.");
      process.exitCode = 3;
      return;
    }

    const listingId = newDbId();
    const slug = `junior-apartamento-salvador-${Date.now()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (plan.durationDays ?? 90) * 24 * 3600 * 1000).toISOString();

    const listing = {
      id: listingId,
      slug,
      title: "Apartamento à venda em Salvador - 3 quartos",
      description: "Apartamento bem localizado em Salvador, próximo a serviços e transporte.",
      category: "REAL_ESTATE",
      type: "Apto",
      priceCents: 25000000,
      city: "Salvador",
      state: "BA",
      district: "Barra",
      status: plan.priceCents > 0 ? "DRAFT" : "ACTIVE",
      showPhone: true,
      showWhatsapp: true,
      searchText: "Apartamento Salvador 3 quartos Barra",
      expiresAt,
      termsAcceptedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ownerId: user.id,
      planId: plan.id
    };

    const { error: insertError } = await db().from("Listing").insert(listing);
    if (insertError) throw insertError;

    // Insert photo
    const photo = { id: newDbId(), listingId, url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80", alt: "Sala ampla" };
    const { error: photoError } = await db().from("Photo").insert(photo);
    if (photoError) throw photoError;

    // Insert real estate details
    const realEstate = { id: newDbId(), listingId, purpose: "Venda", bedrooms: 3, bathrooms: 2, parking: 1, areaM2: 95 };
    const { error: realError } = await db().from("RealEstate").insert(realEstate);
    if (realError) throw realError;

    // Insert subscription for FREE plan
    const { error: subError } = await db().from("Subscription").insert({ id: newDbId(), listingId, planId: plan.id, startsAt: now.toISOString(), endsAt: expiresAt });
    if (subError) throw subError;

    console.log("Anúncio criado com sucesso:", { listingId, slug, owner: user });
  } catch (err) {
    console.error("Erro criando anúncio:", err);
    process.exitCode = 1;
  }
}

main();
