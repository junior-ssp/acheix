import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { createWantedRequest } from "@/lib/wanted-requests";
import { wantedRequestSchema } from "@/lib/wanted-request-validation";
import { revalidatePath, revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.accountBlockedAt) {
      return json({ error: "Sua conta está bloqueada para publicar no Achei X." }, 403);
    }
    if (!user.whatsapp) {
      return json({ error: "Cadastre um WhatsApp no seu perfil antes de registrar o que você procura." }, 422);
    }

    const data = wantedRequestSchema.parse(await request.json());
    const wanted = await createWantedRequest({
      ownerId: user.id,
      title: data.title,
      description: data.description,
      durationDays: data.durationDays
    });
    revalidateTag("acheix-wanted-requests");
    revalidatePath("/");

    return json({ wanted, dashboardUrl: "/dashboard#meus-procura-se" }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
