"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LifeBuoy, Send } from "lucide-react";

import { sendMessageAction } from "@/modules/messaging/actions/send-message";
import { markReadAction } from "@/modules/messaging/actions/mark-read";
import type { ThreadMessage } from "@/modules/messaging/queries/get-conversation-thread";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

function initials(name?: string | null) {
  if (!name) return "MC";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "MC";
}

export function ThreadPanel({
  conversationId,
  otherName,
  kind,
  messages,
  backHref = "/account/messages",
  otherLabel = "Therapist",
}: {
  conversationId: string;
  otherName: string | null;
  kind: "dm" | "therapist";
  messages: ThreadMessage[];
  backHref?: string;
  otherLabel?: string;
}) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Mark the thread read on open, then refresh the unread badge.
  React.useEffect(() => {
    markReadAction({ conversationId })
      .then(() => router.refresh())
      .catch(() => {});
  }, [conversationId, router]);

  // Poll for incoming messages (re-renders the server component).
  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(id);
  }, [router]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const r = await sendMessageAction({ conversationId, body });
      if (r.ok) {
        setText("");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Button asChild variant="ghost" size="icon" aria-label="Back to messages">
          <Link href={backHref}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs font-medium">
            {initials(otherName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{otherName ?? "MindCross member"}</span>
            {kind === "therapist" ? (
              <Badge variant="accent" className="px-1.5 py-0 text-[10px]">
                {otherLabel}
              </Badge>
            ) : null}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-2 py-5" aria-live="polite">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet — say hello.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex flex-col",
                m.mine ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  m.mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-secondary text-secondary-foreground",
                )}
              >
                {m.body}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
                {TIME_FMT.format(new Date(m.createdAt))}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Crisis note */}
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-2.5 text-xs leading-relaxed text-muted-foreground">
        <LifeBuoy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          Messages aren&rsquo;t monitored in real time. In a crisis, call your
          local emergency number (<strong>112</strong> in the EU).
        </span>
      </div>

      {/* Composer */}
      <form onSubmit={send} className="space-y-2">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(e);
              }
            }}
            rows={2}
            maxLength={4000}
            placeholder="Write a message…"
            className="min-h-[44px] flex-1"
            aria-label="Message"
          />
          <Button type="submit" size="icon" disabled={pending || !text.trim()} aria-label="Send">
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
}
