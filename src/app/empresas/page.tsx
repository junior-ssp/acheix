import { ServicesDirectoryPage } from "@/components/services-directory-page";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  return <ServicesDirectoryPage searchParams={searchParams} mode="companies" />;
}
