import { notFound, redirect } from "next/navigation";
import { EditListingForm } from "@/components/edit-listing-form";
import { requireUser } from "@/lib/auth";
import { planCatalog } from "@/lib/constants";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: { slug: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar");

  const { data: listing, error } = await db()
    .from("Listing")
    .select("id,slug,ownerId,title,description,category,type,priceCents,city,state,district,showPhone,showWhatsapp,showEmail,retainChatAudit,planId")
    .eq("slug", params.slug)
    .maybeSingle();
  throwDbError(error);
  if (!listing) notFound();
  if (listing.ownerId !== user.id && user.role !== "ADMIN") redirect("/dashboard#meus-anuncios");

  const [realEstate, photos, plan] = await Promise.all([
    listing.category === "REAL_ESTATE" ? findRealEstate(listing.slug) : null,
    findPhotos(listing.id),
    findPlan(listing.planId)
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-5">
        <p className="text-sm font-black uppercase text-yellow-300">Meus Anúncios</p>
        <h1 className="mt-2 text-3xl font-black">Editar Anúncio</h1>
      </div>
      <EditListingForm
        listing={{ ...listing, realEstate, photos, plan }}
        contactPermissions={{
          phone: user.allowPublicPhone,
          whatsapp: user.allowPublicWhatsapp,
          email: user.allowPublicEmail
        }}
      />
    </main>
  );
}

async function findRealEstate(slug: string) {
  const { data: listing, error: listingError } = await db().from("Listing").select("id").eq("slug", slug).maybeSingle();
  throwDbError(listingError);
  if (!listing) return null;
  const { data, error } = await db().from("RealEstate").select("purpose,maxGuests").eq("listingId", listing.id).maybeSingle();
  throwDbError(error);
  return data;
}

async function findPhotos(listingId: string) {
  const { data, error } = await db()
    .from("Photo")
    .select("id,url,alt,order")
    .eq("listingId", listingId)
    .order("order", { ascending: true });
  throwDbError(error);
  return data ?? [];
}

async function findPlan(planId: string | null) {
  if (!planId) return null;
  const { data, error } = await db()
    .from("Plan")
    .select("id,code,name,photoLimit")
    .eq("id", planId)
    .maybeSingle();
  throwDbError(error);
  if (!data) return null;
  const catalogPlan = planCatalog.find((item) => item.code === data.code);
  return catalogPlan ? { ...catalogPlan, ...data, id: data.id } : data;
}
