import { requireAdmin } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { getSiteAccessStats } from "@/lib/site-access-analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return json(await getSiteAccessStats());
  } catch (error) {
    return errorResponse(error);
  }
}
