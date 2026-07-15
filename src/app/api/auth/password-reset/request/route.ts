import { errorResponse, json } from "@/lib/http";
import { assertEmailDeliveryConfigured, EmailDeliveryError } from "@/lib/notifications";
import { requestPasswordReset } from "@/lib/password-reset";
import { passwordResetRequestSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data = passwordResetRequestSchema.parse(await request.json().catch(() => ({})));
    assertEmailDeliveryConfigured();
    await requestPasswordReset(data.email, request);
    return json({
      ok: true,
      message: "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha."
    });
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      return json({ error: error.message }, 503);
    }
    return errorResponse(error);
  }
}
