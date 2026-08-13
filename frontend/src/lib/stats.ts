import { fetchProtocolEvents, type CircleActivityEvent } from "@/lib/events";

export interface ProtocolStats {
  circlesCreated: number;
  contributionsMade: number;
  contributionVolume: bigint;
  payoutsTriggered: number;
  payoutVolume: bigint;
  uniqueWallets: number;
  events: CircleActivityEvent[];
}

/** Aggregates recent on-chain activity (same ~8 hour window as the activity
 * feed and discovery page) into headline numbers for a public stats page —
 * useful both as a growth feature and as screenshot-able proof of real
 * usage. */
export async function fetchProtocolStats(): Promise<ProtocolStats> {
  const events = await fetchProtocolEvents();

  const wallets = new Set<string>();
  const circleIds = new Set<bigint>();
  let contributionsMade = 0;
  let contributionVolume = 0n;
  let payoutsTriggered = 0;
  let payoutVolume = 0n;

  for (const e of events) {
    if (e.circleId !== null) circleIds.add(e.circleId);

    const addr = e.data.topicAddress;
    if (typeof addr === "string") wallets.add(addr);
    const admin = e.data.admin;
    if (typeof admin === "string") wallets.add(admin);

    if (e.type === "contribution_made") {
      contributionsMade += 1;
      const amount = e.data.amount;
      if (typeof amount === "bigint") contributionVolume += amount;
    }
    if (e.type === "payout_triggered") {
      payoutsTriggered += 1;
      const amount = e.data.amount;
      if (typeof amount === "bigint") payoutVolume += amount;
    }
  }

  return {
    circlesCreated: circleIds.size,
    contributionsMade,
    contributionVolume,
    payoutsTriggered,
    payoutVolume,
    uniqueWallets: wallets.size,
    events,
  };
}
