import { deleteExpiredWantedRequests } from "@/lib/wanted-requests";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (secret && authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const deleted = await deleteExpiredWantedRequests();
  return Response.json({ ok: true, deleted });
}
