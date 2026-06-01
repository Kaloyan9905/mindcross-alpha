"use server";

import { getCurrentUser } from "@/modules/identity";
import { searchClients } from "../queries/search-clients";
import type { ClientSearchResult } from "../queries/search-clients";

/** Search other clients by name for the friend finder. */
export async function searchClientsAction(
  query: string,
): Promise<ClientSearchResult[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return searchClients(user.id, query);
}
