import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { createNotification, queuePush } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireUser();
    const notification = await createNotification(
      user.id,
      "Teste de notificação Achei X",
      "Este é um teste de push com badge. Abra suas mensagens para conferir.",
      {
        linkLabel: "Mensagens",
        linkUrl: "/mensagens",
        primaryActionLabel: "Abrir mensagens",
        primaryActionUrl: "/mensagens"
      }
    );
    const push = await queuePush(user.id, notification.title, notification.message, {
      linkLabel: notification.linkLabel ?? undefined,
      linkUrl: notification.linkUrl ?? undefined,
      primaryActionLabel: notification.primaryActionLabel ?? undefined,
      primaryActionUrl: notification.primaryActionUrl ?? undefined
    });
    return json({ ok: true, notificationId: notification.id, push });
  } catch (error) {
    return errorResponse(error);
  }
}
