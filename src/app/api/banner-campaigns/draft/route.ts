import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { bannerPlans, createBannerCampaignPayment, createComplimentaryBannerCampaign } from "@/lib/banner-campaigns";
import { errorResponse, json } from "@/lib/http";
import { complimentaryReason, isPlatformComplimentaryUser } from "@/lib/platform-complimentary-users";

export const dynamic = "force-dynamic";

const bannerDraftSchema = z.object({
  planType: z.enum(["TOP_15", "TOP_30"]),
  placement: z.enum(["CAROUSEL", "DESKTOP_HERO"]).default("CAROUSEL"),
  bannerQuantity: z.number().int().min(1).max(5),
  periods: z.number().int().min(1).max(6),
  campaignTitle: z.string().trim().min(3).max(80),
  destinationUrl: z.string().trim().url().max(300).refine(isSafeHttpUrl, "Informe um link começando com http:// ou https://."),
  mediaUrl: z.string().trim().url().max(600),
  bannerImagePositionY: z.number().min(0).max(100).default(50),
  imageZoom: z.number().min(1).max(3).default(1),
  imagePositionX: z.number().min(0).max(100).default(50),
  imagePositionY: z.number().min(0).max(100).default(50),
  rainbowBorderEnabled: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(999999).default(1000),
  mediaType: z.enum(["IMAGE"]).default("IMAGE"),
  amountCents: z.number().int().positive()
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = bannerDraftSchema.parse(await request.json());
    const plan = bannerPlans[input.planType];
    const bannerQuantity = input.placement === "DESKTOP_HERO" ? 1 : input.bannerQuantity;

    if (input.periods > plan.maxPeriods) {
      return json({ error: `O período máximo para este plano é de ${plan.maxPeriods} ${input.planType === "TOP_15" ? "quinzenas" : "meses"}.` }, 422);
    }

    const expectedAmountCents = bannerQuantity * input.periods * plan.unitAmountCents;
    if (input.amountCents !== expectedAmountCents) {
      return json({ error: "Valor calculado divergente. Atualize a página e tente novamente." }, 422);
    }

    if (isPlatformComplimentaryUser(user)) {
      const campaign = await createComplimentaryBannerCampaign({
        userId: user.id,
        planType: input.planType,
        placement: input.placement,
        bannerQuantity,
        periods: input.periods,
        campaignTitle: input.campaignTitle,
        destinationUrl: input.destinationUrl,
        mediaUrl: input.mediaUrl,
        bannerImagePositionY: input.bannerImagePositionY,
        imageZoom: input.imageZoom,
        imagePositionX: input.imagePositionX,
        imagePositionY: input.imagePositionY,
        rainbowBorderEnabled: input.rainbowBorderEnabled,
        displayOrder: input.displayOrder,
        mediaType: input.mediaType,
        amountCents: expectedAmountCents,
        reason: complimentaryReason(user)
      });

      return json({
        ok: true,
        status: "ACTIVE",
        campaignId: campaign.campaignId,
        complimentary: true,
        checkoutUrl: "/dashboard#meus-banners",
        amountCents: 0,
        message: "Banner liberado como cortesia automática. Nenhuma cobrança foi gerada."
      });
    }

    const { campaignId, payment } = await createBannerCampaignPayment({
      userId: user.id,
      planType: input.planType,
      placement: input.placement,
      bannerQuantity,
      periods: input.periods,
      campaignTitle: input.campaignTitle,
      destinationUrl: input.destinationUrl,
      mediaUrl: input.mediaUrl,
      bannerImagePositionY: input.bannerImagePositionY,
      imageZoom: input.imageZoom,
      imagePositionX: input.imagePositionX,
      imagePositionY: input.imagePositionY,
      rainbowBorderEnabled: input.rainbowBorderEnabled,
      displayOrder: input.displayOrder,
      mediaType: input.mediaType,
      amountCents: expectedAmountCents
    });

    return json({
      ok: true,
      status: "PENDING_PAYMENT",
      campaignId,
      payment,
      checkoutUrl: `/pagamento?paymentId=${payment.id}`,
      amountCents: expectedAmountCents,
      message: "Banner configurado. Confira a prévia e finalize o pagamento para ativar no carrossel."
    });
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
