import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUser } from "@/modules/identity";
import { listConversations } from "@/modules/messaging";
import { EmptyIllustration } from "@/components/shared/empty-illustration";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessagesRefresher } from "./messages-refresher";

export const metadata: Metadata = { title: "Messages — MindCross" };

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

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const conversations = await listConversations(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <MessagesRefresher />
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversations with your friends and therapists.
        </p>
      </header>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <EmptyIllustration name="chat" className="mb-1" />
            <p className="text-lg font-semibold">No messages yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Message a friend from the Friends tab, or a therapist from one of
              your booked sessions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/account/messages/${c.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="text-xs font-medium">
                    {initials(c.otherName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {c.otherName ?? "MindCross member"}
                    </span>
                    {c.kind === "therapist" ? (
                      <Badge variant="accent" className="shrink-0 px-1.5 py-0 text-[10px]">
                        Therapist
                      </Badge>
                    ) : null}
                  </div>
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
