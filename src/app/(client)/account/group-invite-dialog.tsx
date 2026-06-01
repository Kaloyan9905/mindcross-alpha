"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, UserPlus, Users } from "lucide-react";

import { listFriendsAction } from "@/modules/friends/actions/list-friends";
import { setGroupCapacityAction } from "@/modules/booking/actions/group";
import { inviteToBookingAction } from "@/modules/booking/actions/group";
import { listGuestsForHostAction } from "@/modules/booking/actions/group";
import { MAX_GROUP_CAPACITY } from "@/modules/booking/lib/group-result";
import type { FriendRow } from "@/modules/friends/queries/list-friends";
import type { ParticipantRow } from "@/modules/booking/queries/list-booking-participants";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function initials(name?: string | null) {
  if (!name) return "MC";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "MC";
}

const CAPACITY_OPTIONS = Array.from(
  { length: MAX_GROUP_CAPACITY - 1 },
  (_, i) => i + 2,
); // 2..MAX

/**
 * Host control: turn a session into a group and invite friends to co-join.
 * Friends only — the picker lists the host's accepted friends and their invite
 * state. Capacity is host + guests.
 */
export function GroupInviteDialog({
  bookingId,
  groupCapacity,
  therapistName,
}: {
  bookingId: string;
  groupCapacity: number;
  therapistName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [capacity, setCapacity] = React.useState(Math.max(groupCapacity, 2));
  const [friends, setFriends] = React.useState<FriendRow[]>([]);
  const [guests, setGuests] = React.useState<ParticipantRow[]>([]);

  const statusByUser = React.useMemo(() => {
    const m = new Map<string, ParticipantRow["status"]>();
    for (const g of guests) m.set(g.userId, g.status);
    return m;
  }, [guests]);

  const acceptedCount = guests.filter((g) => g.status === "accepted").length;

  const loadData = React.useCallback(async () => {
    const [f, g] = await Promise.all([
      listFriendsAction(),
      listGuestsForHostAction(bookingId),
    ]);
    setFriends(f);
    setGuests(g);
  }, [bookingId]);

  React.useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      // Enable group mode the first time the host opens this.
      if (groupCapacity <= 1) {
        await setGroupCapacityAction({ bookingId, capacity });
      }
      await loadData();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function changeCapacity(next: number) {
    setCapacity(next);
    startTransition(async () => {
      const r = await setGroupCapacityAction({ bookingId, capacity: next });
      if (!r.ok) {
        toast.error(r.error);
        setCapacity((prev) => prev); // revert visual handled by reload
        await loadData();
      } else {
        router.refresh();
      }
    });
  }

  function invite(friend: FriendRow) {
    startTransition(async () => {
      const r = await inviteToBookingAction({
        bookingId,
        inviteeUserId: friend.userId,
      });
      if (r.ok) {
        toast.success(`Invited ${friend.name ?? "your friend"}.`);
        await loadData();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Users className="h-4 w-4" aria-hidden="true" />
          Invite friends
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite friends to this session</DialogTitle>
          <DialogDescription>
            Share your session with {therapistName} with friends going through
            something similar. They&rsquo;ll get an invitation to accept.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
          <label htmlFor="grp-cap" className="text-sm font-medium">
            Group size
          </label>
          <Select
            value={String(capacity)}
            onValueChange={(v) => changeCapacity(Number(v))}
          >
            <SelectTrigger id="grp-cap" className="h-9 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAPACITY_OPTIONS.filter((n) => n >= acceptedCount + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} people
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {friends.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              You don&rsquo;t have any friends to invite yet. Add some from the
              Friends tab.
            </p>
          ) : (
            friends.map((f) => {
              const status = statusByUser.get(f.userId);
              return (
                <div
                  key={f.userId}
                  className="flex items-center justify-between gap-3 rounded-lg px-1 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs font-medium">
                        {initials(f.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">
                      {f.name ?? "Friend"}
                    </span>
                  </div>
                  {status === "accepted" ? (
                    <Badge variant="success" className="gap-1">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Joined
                    </Badge>
                  ) : status === "invited" ? (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      Invited
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => invite(f)}
                      className="gap-1.5"
                    >
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      Invite
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
