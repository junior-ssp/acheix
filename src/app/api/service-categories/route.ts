import { json } from "@/lib/http";
import { defaultServiceCategories } from "@/lib/service-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ categories: defaultServiceCategories.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) });
}
