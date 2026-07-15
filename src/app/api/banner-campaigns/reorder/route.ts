import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { reorderUserBannerCampaign } from "@/lib/banner-campaigns";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  campaignId: z.string().min(1),
  direction: z.enum(["up", "down"])
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = reorderSchema.parse(await request.json());
    const campaign = await reorderUserBannerCampaign({
      userId: user.id,
      campaignId: input.campaignId,
      direction: input.direction
    });
    return json({ ok: true, campaign, message: "Ordem dos banners atualizada." });
  } catch (error) {
    return errorResponse(error);
  }
}

