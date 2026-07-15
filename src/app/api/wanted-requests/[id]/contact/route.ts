import { errorResponse, json } from "@/lib/http";
import { findWantedRequestContact, recordWantedRequestContactClick } from "@/lib/wanted-requests";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const contact = await findWantedRequestContact(params.id);
    if (!contact) return new Response("Procura-se não encontrado ou expirado.", { status: 404 });
    await recordWantedRequestContactClick(params.id);
    return Response.redirect(contact.whatsappUrl, 302);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const contact = await findWantedRequestContact(params.id);
    if (!contact) return json({ error: "Procura-se não encontrado ou expirado." }, 404);
    await recordWantedRequestContactClick(params.id);
    return json({ whatsappUrl: contact.whatsappUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
