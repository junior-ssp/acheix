import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MessageThread } from "@/components/message-thread";

export const dynamic = "force-dynamic";

export default async function MessageThreadPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=/mensagens/${encodeURIComponent(params.id)}`);
  return <MessageThread conversationKey={decodeURIComponent(params.id)} />;
}
