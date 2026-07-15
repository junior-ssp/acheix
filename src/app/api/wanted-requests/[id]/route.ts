import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { deleteWantedRequest, updateWantedRequest } from "@/lib/wanted-requests";
import { wantedRequestUpdateSchema } from "@/lib/wanted-request-validation";
import { revalidatePath, revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await deleteWantedRequest(params.id, user.id);
    revalidateTag("acheix-wanted-requests");
    revalidatePath("/");
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (user.accountBlockedAt) {
      return json({ error: "Sua conta está bloqueada para editar no Achei X." }, 403);
    }

    const data = wantedRequestUpdateSchema.parse(await request.json());
    const wanted = await updateWantedRequest({
      id: params.id,
      ownerId: user.id,
      title: data.title,
      description: data.description
    });
    if (!wanted) return json({ error: "Procura-se não encontrado." }, 404);
    revalidateTag("acheix-wanted-requests");
    revalidatePath("/");

    return json({ wanted });
  } catch (error) {
    return errorResponse(error);
  }
}
