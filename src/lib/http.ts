import { ZodError } from "zod";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  if (error instanceof ZodError) return json({ error: "validation_error", details: error.flatten() }, 422);
  if (error instanceof Error) return json({ error: error.message }, 400);
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    if (typeof record.code === "string") {
      return json({ error: "Não foi possível concluir a operação agora. Tente novamente em instantes." }, 400);
    }
    const message = typeof record.message === "string" && record.message.trim() ? record.message : "";
    if (message) return json({ error: message }, 400);
  }
  return json({ error: "unexpected_error" }, 500);
}
