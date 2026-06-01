import { notFound } from "next/navigation";

import { getCurrentUser } from "@/modules/identity";
import { getConversationThread } from "@/modules/messaging";
import { ThreadPanel } from "./thread-panel";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const thread = await getConversationThread(conversationId, user.id);
  if (!thread) notFound();

  return (
    <ThreadPanel
      conversationId={conversationId}
      otherName={thread.otherName}
      kind={thread.kind}
      messages={thread.messages}
    />
  );
}
