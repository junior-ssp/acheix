import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { reorderAdminBannerCampaign } from "@/lib/banner-campaigns";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  campaignId: z.string().min(1),
  direction: z.enum(["up", "down"])
});

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const input = reorderSchema.parse(await request.json());
    const campaign = await reorderAdminBannerCampaign({
      adminId: admin.id,
      campaignId: input.campaignId,
      direction: input.direction
    });
    return json({ ok: true, campaign, message: "Ordem geral dos banners atualizada." });
  } catch (error) {
    return errorResponse(error);
  }
}

