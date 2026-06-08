import { json } from "@/lib/http";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.trim().toUpperCase();
  const city = url.searchParams.get("city")?.trim();

  if (!state || !city) return json({ districts: [] });

  const { data, error } = await db()
    .from("service_profiles")
    .select("bairro")
    .eq("active", true)
    .in("status", ["ACTIVE", "INACTIVE"])
    .eq("estado", state)
    .ilike("cidade", city)
    .not("bairro", "is", null)
    .order("bairro", { ascending: true })
    .limit(300);
  throwDbError(error);

  const districts = [...new Set(((data ?? []) as Array<{ bairro: string | null }>)
    .map((row) => row.bairro?.trim())
    .filter((district): district is string => Boolean(district)))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  return json({ districts });
}
