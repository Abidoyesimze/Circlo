import type { CircleView } from "circlo-client";

import { getContractClient } from "@/lib/contract";
import { fetchProtocolEvents } from "@/lib/events";
import { readContract } from "@/lib/tx";

// Discovery inherits the same ~8 hour event window as the activity feed
// (see lib/events.ts) — an acceptable tradeoff, since the circles worth
// *discovering* are ones still open to join, not ones from days ago that
// have likely already started or completed.
const MAX_CIRCLES = 40;

export interface DiscoveredCircle {
  id: bigint;
  view: CircleView;
}

/** Finds recently-created circles by reading CircleCreated events, then
 * fetches each one's live status (event data only reflects state at
 * creation time, not whether it's since started or completed). */
export async function discoverCircles(): Promise<DiscoveredCircle[]> {
  const events = await fetchProtocolEvents();

  const ids = new Set<bigint>();
  for (const event of events) {
    if (event.type === "circle_created" && event.circleId !== null) {
      ids.add(event.circleId);
    }
  }

  const recentIds = Array.from(ids)
    .sort((a, b) => (b > a ? 1 : -1))
    .slice(0, MAX_CIRCLES);

  const client = getContractClient();
  const results = await Promise.all(
    recentIds.map(async (id) => {
      try {
        const view = await readContract(client.get_status({ circle_id: id }));
        return { id, view };
      } catch {
        return null;
      }
    }),
  );

  return results.filter((c): c is DiscoveredCircle => c !== null);
}
