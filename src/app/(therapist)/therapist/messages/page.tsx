import type { Metadata } from "next";
import Link from "next/link";

import { getTherapistForCurrentUser } from "@/modules/therapists";
import { listTherapistConversations } from "@/modules/messaging";
import { EmptyIllustration } from "@/components/shared/empty-illustration";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessagesRefresher } from "@/app/(client)/account/messages/messages-refresher";

export const metadata: Metadata = { title: "Messages · Therapist — MindCross" };

const FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function initials(name?: string | null) {
  if (!name) return "MC";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "MC";
}

export default async function TherapistMessagesPage() {
  const therapist = await getTherapistForCurrentUser();
  if (!therapist) return null;
  const conversations = await listTherapistConversations(therapist.id);

  return (
    <div className="space-y-6">
      <MessagesRefresher />
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Conversations with clients you have a session with.
        </p>
      </header>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <EmptyIllustration name="chat" className="mb-1" />
            <p className="text-lg font-semibold">No messages yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              When a client with a booking messages you, the conversation will
              appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/therapist/messages/${c.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="text-xs font-medium">
                    {initials(c.otherName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <span className="truncate font-medium">
                    {c.otherName ?? "Client"}
                  </span>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.lastMessagePreview ?? "No messages yet"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {FMT.format(new Date(c.lastMessageAt))}
                  </span>
                  {c.unreadCount > 0 ? (
                    <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                      {c.unreadCount}
                    </Badge>
                  ) : null}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
