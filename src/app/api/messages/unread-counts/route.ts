import { requireUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { getUnreadMessageCounts } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const counts = await getUnreadMessageCounts(user.id);
    return json({ counts, unreadCount: counts.total });
  } catch (error) {
    return errorResponse(error);
  }
}
