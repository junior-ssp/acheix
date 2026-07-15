import { errorResponse, json } from "@/lib/http";
import { recordSiteAccess } from "@/lib/site-access-analytics";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pagePath = String(body?.pagePath ?? "");
    const result = await recordSiteAccess({ request, pagePath });
    return json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
