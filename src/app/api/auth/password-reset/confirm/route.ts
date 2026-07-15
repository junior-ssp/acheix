import { errorResponse, json } from "@/lib/http";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { passwordResetConfirmSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data = passwordResetConfirmSchema.parse(await request.json().catch(() => ({})));
    await resetPasswordWithToken(data.token, data.password);
    return json({
      ok: true,
      message: "Senha alterada com sucesso. Você já pode entrar com a nova senha."
    });
  } catch (error) {
    return errorResponse(error);
  }
}
