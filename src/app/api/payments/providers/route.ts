import { requireAdmin } from "@/lib/auth";
import { isAsaasConfigured } from "@/lib/asaas";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return json({
      asaasConfigured: isAsaasConfigured(),
      asaasBaseUrlConfigured: Boolean(process.env.ASAAS_BASE_URL),
      asaasWebhookTokenConfigured: Boolean(process.env.ASAAS_WEBHOOK_TOKEN)
    });
  } catch (error) {
    return errorResponse(error);
  }
}
