import { db, throwDbError } from "@/lib/supabase-db";

export async function getUserBlockState(currentUserId: string, otherUserId: string) {
  const [blockedByCurrent, blockedByOther] = await Promise.all([
    findBlock(currentUserId, otherUserId),
    findBlock(otherUserId, currentUserId)
  ]);
  return { blocked: blockedByCurrent || blockedByOther, blockedByCurrent, blockedByOther };
}

export async function isMessagingBlockedBetween(firstUserId: string, secondUserId: string) {
  return (await getUserBlockState(firstUserId, secondUserId)).blocked;
}

async function findBlock(blockerUserId: string, blockedUserId: string) {
  const { data, error } = await db()
    .from("AuditLog")
    .select("id")
    .eq("userId", blockerUserId)
    .eq("action", "user.blocked")
    .contains("metadata", { blockedUserId })
    .limit(1)
    .maybeSingle();
  throwDbError(error);
  return Boolean(data);
}
