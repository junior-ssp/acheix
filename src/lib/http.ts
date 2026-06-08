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
    const message = [record.message, record.details, record.hint].filter((item) => typeof item === "string" && item.trim()).join(" ");
    if (message) return json({ error: message, code: typeof record.code === "string" ? record.code : undefined }, 400);
  }
  return json({ error: "unexpected_error" }, 500);
}
