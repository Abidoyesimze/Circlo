// Imported directly from @stellar/stellar-sdk (not re-exported via
// circlo-client) — circlo-client's generated `export * from
// "@stellar/stellar-sdk"` is a CJS re-export that the browser's native ESM
// loader can't statically resolve when the file is served unbundled, so
// named exports like `scValToNative` come back undefined at runtime.
import { scValToNative, type xdr } from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";

import { CONTRACT_ID, RPC_URL } from "@/config";

export interface CircleActivityEvent {
  id: string;
  ledger: number;
  txHash: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number | null;
}

// The public soroban-testnet RPC silently returns zero events (not an error)
// once the requested range exceeds an undocumented cap somewhere between
// 10,000-17,280 ledgers — confirmed by direct testing, not documented
// anywhere. Stay well under it; a live demo only ever needs recent history.
const EVENT_WINDOW_LEDGERS = 6000; // ~8.3 hours at ~5s/ledger

/** Fetches recent on-chain events for a single circle, newest first. */
export async function fetchCircleActivity(circleId: bigint): Promise<CircleActivityEvent[]> {
  const server = new rpc.Server(RPC_URL);
  const latest = await server.getLatestLedger();
  const startLedger = Math.max(1, latest.sequence - EVENT_WINDOW_LEDGERS);

  const response = await server.getEvents({
    startLedger,
    filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
    limit: 1000,
  });

  const events: CircleActivityEvent[] = [];
  for (const event of response.events) {
    try {
      const topics = event.topic.map((t) => scValToNative(t));
      const [eventType, topicCircleId] = topics as [string, bigint | undefined];
      if (topicCircleId === undefined || topicCircleId !== circleId) continue;

      const value = scValToNative(event.value as xdr.ScVal);
      const data: Record<string, unknown> =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : { value };

      // Some events carry a second identity topic (e.g. member) after the
      // circle id; surface it under a stable key for the feed to render.
      if (topics.length > 2) data.topicAddress = topics[2];

      events.push({
        id: event.id,
        ledger: event.ledger,
        txHash: event.txHash,
        type: eventType,
        data,
        timestamp: event.ledgerClosedAt ? Date.parse(event.ledgerClosedAt) : null,
      });
    } catch {
      // Skip events we can't decode rather than failing the whole feed.
      continue;
    }
  }

  return events.sort((a, b) => b.ledger - a.ledger);
}
