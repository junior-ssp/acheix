import { db } from "../src/lib/supabase-db";

async function main() {
  const email = (process.argv[2] || "").toLowerCase();
  if (!email) {
    console.error("Usage: tsx scripts/check-user.ts user@example.com");
    process.exit(1);
  }

  try {
    const { data: user, error: userError } = await db()
      .from("User")
      .select("id,name,email,accountBlockedAt,createdAt")
      .eq("email", email)
      .maybeSingle();
    if (userError) throw userError;
    console.log("User:", user ?? "<not found>");

    const { data: listings, error: listError } = await db()
      .from("Listing")
      .select("id,title,status,createdAt,expiresAt")
      .eq("ownerId", user?.id ?? "-1");
    if (listError) throw listError;
    console.log("Listings:", listings ?? []);

    const { data: audits, error: auditError } = await db()
      .from("AuditLog")
      .select("id,userId,action,metadata,createdAt")
      .or("eq.action.auth.password_reset.requested,eq.action.email.skipped,eq.action.email.queued")
      .order("createdAt", { ascending: false })
      .limit(50);
    if (auditError) throw auditError;
    const related = (audits ?? []).filter((a: any) => {
      const m = a.metadata as any;
      return (m && (m.email === email || m.to === email)) || a.userId === user?.id;
    });
    console.log("AuditLog (related):", related);
  } catch (err) {
    console.error("Error:", err);
    process.exit(2);
  }
}

main();
