import { notFound, redirect } from "next/navigation";
import { EditListingForm } from "@/components/edit-listing-form";
import { requireUser } from "@/lib/auth";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: { slug: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar");

  const { data: listing, error } = await db()
    .from("Listing")
    .select("slug,ownerId,title,description,category,type,priceCents,city,state,district")
    .eq("slug", params.slug)
    .maybeSingle();
  throwDbError(error);
  if (!listing) notFound();
  if (listing.ownerId !== user.id && user.role !== "ADMIN") redirect("/dashboard#meus-anuncios");

  const realEstate = listing.category === "REAL_ESTATE" ? await findRealEstate(listing.slug) : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-5">
        <p className="text-sm font-black uppercase text-yellow-300">Meus Anúncios</p>
        <h1 className="mt-2 text-3xl font-black">Editar Anúncio</h1>
      </div>
      <EditListingForm listing={{ ...listing, realEstate }} />
    </main>
  );
}

async function findRealEstate(slug: string) {
  const { data: listing, error: listingError } = await db().from("Listing").select("id").eq("slug", slug).maybeSingle();
  throwDbError(listingError);
  if (!listing) return null;
  const { data, error } = await db().from("RealEstate").select("purpose").eq("listingId", listing.id).maybeSingle();
  throwDbError(error);
  return data;
}
