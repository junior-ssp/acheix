import { clearAllSessionCookies } from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST() {
  clearAllSessionCookies();
  return json({ ok: true });
}
