import { notFound } from "next/navigation";

import { getCurrentUser } from "@/modules/identity";
import { getConversationThread } from "@/modules/messaging";
import { ThreadPanel } from "@/app/(client)/account/messages/[conversationId]/thread-panel";

export default async function TherapistThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  // The (therapist) layout already gates non-therapists; the viewer here is the
  // therapist's own user account.
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
      backHref="/therapist/messages"
      otherLabel="Client"
    />
  );
}
