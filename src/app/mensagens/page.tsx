import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MessagesInbox } from "@/components/messages-inbox";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/mensagens");
  return <MessagesInbox />;
}
