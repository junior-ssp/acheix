import { redirect } from "next/navigation";
import { getCurrentAdminSessionUser, requireAdmin } from "@/lib/auth";

export type AdminAccessLevel = "SUPER_ADMIN" | "MODERATOR";

function parseEmailList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requireBackofficeUser() {
  const user = await requireAdmin();
  return toBackofficeUser(user);
}

export async function requireBackofficePageUser() {
  const user = await getCurrentAdminSessionUser();

  if (!user) {
    redirect("/entrar?next=/admin");
  }

  return toBackofficeUser(user);
}

function toBackofficeUser(user: Awaited<ReturnType<typeof getCurrentAdminSessionUser>>) {
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const email = user.email.toLowerCase();
  const superAdmins = parseEmailList(process.env.ADMIN_SUPER_EMAILS);
  const moderators = parseEmailList(process.env.ADMIN_MODERATOR_EMAILS);

  const level: AdminAccessLevel = superAdmins.size === 0 || superAdmins.has(email)
    ? "SUPER_ADMIN"
    : moderators.has(email)
      ? "MODERATOR"
      : "MODERATOR";

  return { ...user, adminAccessLevel: level };
}

export async function requireSuperAdmin() {
  const admin = await requireBackofficeUser();
  if (admin.adminAccessLevel !== "SUPER_ADMIN") throw new Response("Forbidden", { status: 403 });
  return admin;
}
