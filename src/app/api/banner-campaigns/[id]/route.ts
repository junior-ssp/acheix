import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { removeBannerCampaign, updateActiveBannerCampaign } from "@/lib/banner-campaigns";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  campaignTitle: z.string().trim().min(3).max(80),
  destinationUrl: z.string().trim().url().max(300).refine(isSafeHttpUrl, "Informe um link começando com http:// ou https://."),
  mediaUrl: z.string().trim().url().max(600),
  bannerImagePositionY: z.number().min(0).max(100).default(50),
  imageZoom: z.number().min(1).max(3).default(1),
  imagePositionX: z.number().min(0).max(100).default(50),
  imagePositionY: z.number().min(0).max(100).default(50),
  rainbowBorderEnabled: z.boolean().default(false)
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const input = updateSchema.parse(await request.json());
    const campaign = await updateActiveBannerCampaign({
      campaignId: params.id,
      userId: user.id,
      campaignTitle: input.campaignTitle,
      destinationUrl: input.destinationUrl,
      mediaUrl: input.mediaUrl,
      bannerImagePositionY: input.bannerImagePositionY,
      imageZoom: input.imageZoom,
      imagePositionX: input.imagePositionX,
      imagePositionY: input.imagePositionY,
      rainbowBorderEnabled: input.rainbowBorderEnabled
    });
    return json({ ok: true, campaign, message: "Banner atualizado com sucesso." });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const campaign = await removeBannerCampaign({ campaignId: params.id, userId: user.id });
    return json({ ok: true, campaign, message: "Banner removido da exibição." });
  } catch (error) {
    return errorResponse(error);
  }
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
