import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { withTimeout } from "@/lib/async";
import { db, throwDbError } from "@/lib/supabase-db";
import { DashboardLeads } from "@/components/dashboard-leads";

export const dynamic = "force-dynamic";

type ListingMini = { id: string; title: string; slug: string; category: string };
type ServiceMini = { id: string; title: string | null; services: string[] | null };
type ProfileMini = { id: string; name: string | null; nome_fantasia: string | null; categoria_servico: string | null };
type ContactRow = {
  id: string;
  serviceId: string | null;
  profileId: string | null;
  interestedUserId: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  createdAt: string;
};

export default async function MessagesPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/entrar");

  const [receivedLeads, sentLeads, receivedServiceContacts, sentServiceContacts] = await withTimeout(
    findMessages(user.id),
    [[], [], [], []] as const,
    1800
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="soft-card rounded-3xl p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/15 text-yellow-300">
          <MessageCircle size={24} />
        </div>
        <h1 className="text-3xl font-black">Mensagens</h1>
        <p className="mt-3 text-neutral-300">
          Veja aqui todas as suas mensagens.
        </p>
      </div>

      <DashboardLeads
        ownerName={user.name}
        received={[
          ...receivedLeads.map((lead) => ({
            id: lead.id,
            kind: "LISTING" as const,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            question1: lead.question1,
            question2: lead.question2,
            question3: lead.question3,
            status: lead.status,
            createdAt: new Date(lead.createdAt).toISOString(),
            listing: { title: lead.listing.title, slug: lead.listing.slug, category: lead.listing.category }
          })),
          ...receivedServiceContacts.map((contact) => ({
            id: contact.id,
            kind: "SERVICE" as const,
            name: contact.name,
            email: contact.email,
            phone: contact.phone ?? "",
            question1: contact.message ?? "Tenho interesse neste serviço.",
            question2: null,
            question3: null,
            status: contact.status,
            createdAt: new Date(contact.createdAt).toISOString(),
            service: serviceLabel(contact)
          }))
        ]}
        sent={[
          ...sentLeads.map((lead) => ({
            id: lead.id,
            kind: "LISTING" as const,
            status: lead.status,
            readAt: lead.readAt ? new Date(lead.readAt).toISOString() : null,
            createdAt: new Date(lead.createdAt).toISOString(),
            listing: { title: lead.listing.title, slug: lead.listing.slug, category: lead.listing.category }
          })),
          ...sentServiceContacts.map((contact) => ({
            id: contact.id,
            kind: "SERVICE" as const,
            status: contact.status,
            readAt: null,
            createdAt: new Date(contact.createdAt).toISOString(),
            service: serviceLabel(contact)
          }))
        ]}
      />
    </main>
  );
}

async function findMessages(userId: string) {
  const [receivedLeads, sentLeads, receivedServiceContacts, sentServiceContacts] = await Promise.all([
    findReceivedListingLeads(userId),
    findSentListingLeads(userId),
    findReceivedServiceContacts(userId),
    findSentServiceContacts(userId)
  ]);
  return [receivedLeads, sentLeads, receivedServiceContacts, sentServiceContacts] as const;
}

async function findReceivedListingLeads(userId: string) {
  const { data: listings, error: listingsError } = await db()
    .from("Listing")
    .select("id,title,slug,category")
    .eq("ownerId", userId);
  throwDbError(listingsError);
  const listingRows = ((listings ?? []) as ListingMini[]);
  const listingById = new Map(listingRows.map((listing) => [listing.id, listing]));
  const listingIds = listingRows.map((listing) => listing.id);
  if (!listingIds.length) return [];
  const { data, error } = await db()
    .from("ContactLead")
    .select("*")
    .in("listingId", listingIds)
    .order("createdAt", { ascending: false })
    .limit(40);
  throwDbError(error);
  return ((data ?? []) as Array<any>)
    .map((lead) => ({ ...lead, listing: listingById.get(lead.listingId) }))
    .filter((lead) => lead.listing);
}

async function findSentListingLeads(userId: string) {
  const { data, error } = await db()
    .from("ContactLead")
    .select("*")
    .eq("interestedUserId", userId)
    .order("createdAt", { ascending: false })
    .limit(40);
  throwDbError(error);
  const leads = (data ?? []) as Array<any>;
  const listingIds = [...new Set(leads.map((lead) => lead.listingId).filter(Boolean))];
  const listingById = await findListingsByIds(listingIds);
  return leads
    .map((lead) => ({ ...lead, listing: listingById.get(lead.listingId) }))
    .filter((lead) => lead.listing);
}

async function findReceivedServiceContacts(userId: string) {
  const [profiles, services] = await Promise.all([findProfilesByUser(userId), findServicesByOwner(userId)]);
  const profileIds = profiles.map((profile) => profile.id);
  const serviceIds = services.map((service) => service.id);
  const [profileContacts, serviceContacts] = await Promise.all([
    profileIds.length ? findServiceContactsBy("profileId", profileIds) : [],
    serviceIds.length ? findServiceContactsBy("serviceId", serviceIds) : []
  ]);
  const contacts = mergeContacts(profileContacts, serviceContacts).slice(0, 40);
  return hydrateServiceContacts(contacts, profiles, services);
}

async function findSentServiceContacts(userId: string) {
  const { data, error } = await db()
    .from("ServiceContact")
    .select("*")
    .eq("interestedUserId", userId)
    .order("createdAt", { ascending: false })
    .limit(40);
  throwDbError(error);
  return hydrateServiceContacts((data ?? []) as ContactRow[]);
}

async function findProfilesByUser(userId: string) {
  const { data, error } = await db()
    .from("service_profiles")
    .select("id,name,nome_fantasia,categoria_servico")
    .eq("user_id", userId);
  throwDbError(error);
  return (data ?? []) as ProfileMini[];
}

async function findServicesByOwner(ownerId: string) {
  const { data, error } = await db()
    .from("ServiceListing")
    .select("id,title,services")
    .eq("ownerId", ownerId);
  throwDbError(error);
  return (data ?? []) as ServiceMini[];
}

async function findServiceContactsBy(column: "profileId" | "serviceId", ids: string[]) {
  const { data, error } = await db()
    .from("ServiceContact")
    .select("*")
    .in(column, ids)
    .order("createdAt", { ascending: false })
    .limit(40);
  throwDbError(error);
  return (data ?? []) as ContactRow[];
}

async function hydrateServiceContacts(contacts: ContactRow[], knownProfiles: ProfileMini[] = [], knownServices: ServiceMini[] = []) {
  const profileIds = [...new Set(contacts.map((contact) => contact.profileId).filter(Boolean) as string[])];
  const serviceIds = [...new Set(contacts.map((contact) => contact.serviceId).filter(Boolean) as string[])];
  const [profileMap, serviceMap] = await Promise.all([
    mergeProfileMap(knownProfiles, profileIds),
    mergeServiceMap(knownServices, serviceIds)
  ]);
  return contacts.map((contact) => ({
    ...contact,
    profile: contact.profileId ? profileMap.get(contact.profileId) ?? null : null,
    service: contact.serviceId ? serviceMap.get(contact.serviceId) ?? null : null
  }));
}

async function mergeProfileMap(known: ProfileMini[], ids: string[]) {
  const existing = new Map(known.map((profile) => [profile.id, profile]));
  const missingIds = ids.filter((id) => !existing.has(id));
  if (missingIds.length) {
    const { data, error } = await db()
      .from("service_profiles")
      .select("id,name,nome_fantasia,categoria_servico")
      .in("id", missingIds);
    throwDbError(error);
    for (const profile of (data ?? []) as ProfileMini[]) existing.set(profile.id, profile);
  }
  return existing;
}

async function mergeServiceMap(known: ServiceMini[], ids: string[]) {
  const existing = new Map(known.map((service) => [service.id, service]));
  const missingIds = ids.filter((id) => !existing.has(id));
  if (missingIds.length) {
    const { data, error } = await db()
      .from("ServiceListing")
      .select("id,title,services")
      .in("id", missingIds);
    throwDbError(error);
    for (const service of (data ?? []) as ServiceMini[]) existing.set(service.id, service);
  }
  return existing;
}

async function findListingsByIds(ids: string[]) {
  if (!ids.length) return new Map<string, ListingMini>();
  const { data, error } = await db()
    .from("Listing")
    .select("id,title,slug,category")
    .in("id", ids);
  throwDbError(error);
  return new Map(((data ?? []) as ListingMini[]).map((listing) => [listing.id, listing]));
}

function mergeContacts(...groups: ContactRow[][]) {
  const byId = new Map<string, ContactRow>();
  for (const group of groups) {
    for (const contact of group) byId.set(contact.id, contact);
  }
  return [...byId.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function serviceLabel(contact: { profile?: ProfileMini | null; service?: ServiceMini | null }) {
  return {
    title: contact.profile?.nome_fantasia ?? contact.profile?.name ?? contact.service?.title ?? "Serviço",
    category: contact.profile?.categoria_servico ?? contact.service?.services?.[0] ?? "servico"
  };
}
