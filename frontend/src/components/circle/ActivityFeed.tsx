import {
  ArrowUpRight,
  Ban,
  Coins,
  Flag,
  LogIn,
  PartyPopper,
  PlayCircle,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import type { CircleActivityEvent } from "@/lib/events";
import { EXPLORER_TX_URL } from "@/config";
import { formatTokenAmount, truncateAddress } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const EVENT_META: Record<string, { icon: typeof Coins; label: (e: CircleActivityEvent) => string }> = {
  circle_created: { icon: Flag, label: () => "Circle created" },
  member_joined: {
    icon: LogIn,
    label: (e) => `${truncateAddress(String(e.data.topicAddress ?? ""))} joined`,
  },
  deposit_paid: {
    icon: Wallet,
    label: (e) => `Deposit of ${formatTokenAmount(e.data.amount as bigint)} USDC paid`,
  },
  circle_started: { icon: PlayCircle, label: () => "Circle started — rotation is live" },
  contribution_made: {
    icon: Coins,
    label: (e) =>
      `${truncateAddress(String(e.data.topicAddress ?? ""))} contributed ${formatTokenAmount(
        e.data.amount as bigint,
      )} USDC (cycle ${e.data.cycle})`,
  },
  payout_triggered: {
    icon: ArrowUpRight,
    label: (e) =>
      `${formatTokenAmount(e.data.amount as bigint)} USDC paid to ${truncateAddress(
        String(e.data.topicAddress ?? ""),
      )} (cycle ${e.data.cycle})`,
  },
  cycle_skipped: {
    icon: Ban,
    label: (e) => `Cycle ${e.data.cycle} skipped — nobody contributed`,
  },
  member_defaulted: {
    icon: ShieldAlert,
    label: (e) =>
      `${truncateAddress(String(e.data.topicAddress ?? ""))} missed cycle ${e.data.cycle}`,
  },
  deposit_claimed: {
    icon: Wallet,
    label: (e) =>
      `${truncateAddress(String(e.data.topicAddress ?? ""))} claimed a ${formatTokenAmount(
        e.data.amount as bigint,
      )} USDC deposit refund`,
  },
  circle_completed: { icon: PartyPopper, label: () => "Circle completed — every member has been paid" },
};

interface ActivityFeedProps {
  events: CircleActivityEvent[] | null;
  loading: boolean;
}

export function ActivityFeed({ events, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="space-y-1">
      {events.map((event) => {
        const meta = EVENT_META[event.type];
        const Icon = meta?.icon ?? Coins;
        return (
          <li key={event.id}>
            <a
              href={EXPLORER_TX_URL(event.txHash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-secondary"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">
                {meta ? meta.label(event) : event.type}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {event.timestamp
                  ? new Date(event.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : `ledger ${event.ledger}`}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
