import { getCurrentUser, setSessionCookie, signSession } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    setSessionCookie(signSession({ userId: user.id, role: user.role }), { remember: true });
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
