import type { Metadata } from "next";

import { getCurrentUser } from "@/modules/identity";
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
} from "@/modules/friends";
import { FriendsPanel } from "./friends-panel";

export const metadata: Metadata = { title: "Friends — MindCross" };

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [friends, incoming, outgoing] = await Promise.all([
    listFriends(user.id),
    listIncomingRequests(user.id),
    listOutgoingRequests(user.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Friends</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find people, accept requests, and start a conversation. You choose who
          you connect with — you can remove or block anyone at any time.
        </p>
      </header>
      <FriendsPanel friends={friends} incoming={incoming} outgoing={outgoing} />
    </div>
  );
}
