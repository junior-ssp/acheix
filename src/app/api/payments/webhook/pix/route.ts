import { errorResponse, json } from "@/lib/http";
import { confirmRenewalPayment } from "@/lib/payments";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pixWebhookSchema = z.object({
  paymentId: z.string().min(1),
  status: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const secret = process.env.PIX_WEBHOOK_SECRET;
    if (secret) {
      const receivedSecret = request.headers.get("x-pix-webhook-secret");
      if (receivedSecret !== secret) return json({ error: "Webhook não autorizado." }, 401);
    }

    const body = pixWebhookSchema.parse(await request.json());
    if (!isPaidStatus(body.status)) {
      return json({ ok: true, ignored: true, status: body.status });
    }

    const payment = await confirmRenewalPayment(body.paymentId);
    return json({ ok: true, paymentId: payment.id, status: payment.status });
  } catch (error) {
    return errorResponse(error);
  }
}

function isPaidStatus(status: string) {
  return ["PAID", "paid", "approved", "APPROVED", "confirmed", "CONFIRMED"].includes(status);
}

