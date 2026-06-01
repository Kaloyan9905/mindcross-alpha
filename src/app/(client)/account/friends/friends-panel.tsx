"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Clock,
  MessageCircle,
  Search,
  ShieldAlert,
  UserMinus,
  UserPlus,
  UserX,
} from "lucide-react";

import { searchClientsAction } from "@/modules/friends/actions/search-clients";
import { sendFriendRequestAction } from "@/modules/friends/actions/send-friend-request";
import { respondToRequestAction } from "@/modules/friends/actions/respond-to-request";
import { removeFriendAction } from "@/modules/friends/actions/remove-friend";
import { blockUserAction } from "@/modules/friends/actions/block-user";
import { reportUserAction } from "@/modules/friends/actions/report-user";
import { getOrCreateConversationAction } from "@/modules/messaging/actions/get-or-create-conversation";
import type { ClientSearchResult } from "@/modules/friends/queries/search-clients";
import type { FriendRow } from "@/modules/friends/queries/list-friends";
import type { FriendRequestRow } from "@/modules/friends/queries/list-requests";
import type { ReportReason } from "@/modules/friends/db/schema";

import { EmptyIllustration } from "@/components/shared/empty-illustration";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function initials(name?: string | null) {
  if (!name) return "MC";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "MC";
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate messages" },
  { value: "spam", label: "Spam" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "other", label: "Something else" },
];

function PersonRow({
  name,
  children,
}: {
  name: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-xs font-medium">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate font-medium">{name ?? "MindCross member"}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

export function FriendsPanel({
  friends,
  incoming,
  outgoing,
}: {
  friends: FriendRow[];
  incoming: FriendRequestRow[];
  outgoing: FriendRequestRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  // --- search ---
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ClientSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    const q = query.trim();
    const t = setTimeout(
      async () => {
        if (q.length < 2) {
          setResults([]);
          setSearching(false);
          return;
        }
        setSearching(true);
        try {
          setResults(await searchClientsAction(q));
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      },
      q.length < 2 ? 0 : 300,
    );
    return () => clearTimeout(t);
  }, [query]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(ok);
        router.refresh();
      } else {
        toast.error(r.error ?? "Something went wrong.");
      }
    });
  }

  function addFriend(id: string) {
    startTransition(async () => {
      const r = await sendFriendRequestAction({ addresseeId: id });
      if (r.ok) {
        toast.success("Request sent.");
        setResults((prev) =>
          prev.map((x) => (x.id === id ? { ...x, status: "request_sent" } : x)),
        );
      } else {
        toast.error(r.error);
      }
    });
  }

  function openChat(otherUserId: string) {
    startTransition(async () => {
      const r = await getOrCreateConversationAction({ kind: "dm", otherUserId });
      if (r.ok) router.push(`/account/messages/${r.conversationId}`);
      else toast.error(r.error);
    });
  }

  // --- report dialog ---
  const [reportTarget, setReportTarget] = React.useState<FriendRow | null>(null);
  const [reportReason, setReportReason] = React.useState<ReportReason>("harassment");
  const [reportDetails, setReportDetails] = React.useState("");

  function submitReport() {
    if (!reportTarget) return;
    const target = reportTarget;
    startTransition(async () => {
      const r = await reportUserAction({
        reportedId: target.userId,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
        context: "friends",
      });
      if (r.ok) {
        toast.success("Thank you — our team will review this.");
        setReportTarget(null);
        setReportDetails("");
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Find friends */}
      <section>
        <label
          htmlFor="friend-search"
          className="mb-2 block text-sm font-medium"
        >
          Find people
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="friend-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="pl-9"
            autoComplete="off"
          />
        </div>
        {query.trim().length >= 2 ? (
          <Card className="mt-3">
            <CardContent className="divide-y divide-border p-0">
              {searching && results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Searching…
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No one found by that name.
                </p>
              ) : (
                results.map((r) => (
                  <PersonRow key={r.id} name={r.name}>
                    {r.status === "friends" ? (
                      <Badge variant="success" className="gap-1">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Friends
                      </Badge>
                    ) : r.status === "request_sent" ? (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        Requested
                      </Badge>
                    ) : r.status === "request_received" ? (
                      <Badge variant="accent">Wants to connect</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => addFriend(r.id)}
                        className="gap-1.5"
                      >
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Add
                      </Button>
                    )}
                  </PersonRow>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>

      {/* Incoming requests */}
      {incoming.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold">
            Requests for you ({incoming.length})
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {incoming.map((req) => (
                <PersonRow key={req.friendshipId} name={req.name}>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          respondToRequestAction({
                            friendshipId: req.friendshipId,
                            decision: "accept",
                          }),
                        "You're now connected.",
                      )
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          respondToRequestAction({
                            friendshipId: req.friendshipId,
                            decision: "decline",
                          }),
                        "Request declined.",
                      )
                    }
                  >
                    Decline
                  </Button>
                </PersonRow>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Outgoing requests */}
      {outgoing.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Sent requests</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {outgoing.map((req) => (
                <PersonRow key={req.friendshipId} name={req.name}>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Pending
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => removeFriendAction({ otherUserId: req.userId }),
                        "Request withdrawn.",
                      )
                    }
                  >
                    Withdraw
                  </Button>
                </PersonRow>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Friends */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">
          Your friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <EmptyIllustration name="friends" className="mb-1" />
              <p className="text-sm text-muted-foreground">
                No friends yet. Search above to find people you know.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {friends.map((f) => (
                <PersonRow key={f.friendshipId} name={f.name}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => openChat(f.userId)}
                    className="gap-1.5"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Message
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    title="Remove friend"
                    aria-label={`Remove ${f.name ?? "friend"}`}
                    onClick={() =>
                      run(
                        () => removeFriendAction({ otherUserId: f.userId }),
                        "Friend removed.",
                      )
                    }
                  >
                    <UserMinus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    title="Block"
                    aria-label={`Block ${f.name ?? "this person"}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      run(
                        () => blockUserAction({ blockedId: f.userId }),
                        "Blocked. They can no longer reach you.",
                      )
                    }
                  >
                    <UserX className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    title="Report"
                    aria-label={`Report ${f.name ?? "this person"}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setReportTarget(f)}
                  >
                    <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </PersonRow>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Report dialog */}
      <Dialog
        open={reportTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setReportTarget(null);
            setReportDetails("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {reportTarget?.name ?? "this person"}</DialogTitle>
            <DialogDescription>
              Tell us what happened. Reports are private and reviewed by our
              support team. If you&rsquo;re in immediate danger, contact your
              local emergency number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((r) => (
                <Button
                  key={r.value}
                  type="button"
                  size="sm"
                  variant={reportReason === r.value ? "default" : "outline"}
                  aria-pressed={reportReason === r.value}
                  onClick={() => setReportReason(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <Textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Add any details that would help (optional)."
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={submitReport} disabled={pending}>
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
