import * as React from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Clock, Copy, PlayCircle, RefreshCcw, Users, Wallet } from "lucide-react";

import { useWallet } from "@/contexts/WalletContext";
import { useCircleStatus } from "@/hooks/useCircleStatus";
import { useCircleActivity } from "@/hooks/useCircleActivity";
import { getContractClient } from "@/lib/contract";
import { sendContract } from "@/lib/tx";
import { formatTokenAmount, truncateAddress } from "@/lib/utils";
import { formatCountdown, formatDuration, statusLabel, statusVariant } from "@/lib/circle";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberRow } from "@/components/circle/MemberRow";
import { PayoutTimeline } from "@/components/circle/PayoutTimeline";
import { ActivityFeed } from "@/components/circle/ActivityFeed";

export function CircleDetail() {
  const { id } = useParams<{ id: string }>();
  const circleId = id && /^\d+$/.test(id) ? BigInt(id) : null;
  const { address, status: walletStatus, connect } = useWallet();
  const { circle, loading, error, refresh } = useCircleStatus(circleId);
  const { events, loading: eventsLoading, refresh: refreshActivity } = useCircleActivity(circleId);
  const [pending, setPending] = React.useState<string | null>(null);

  async function withAction(name: string, action: () => Promise<unknown>) {
    setPending(name);
    try {
      await action();
      await Promise.all([refresh(), refreshActivity()]);
    } catch {
      // sendContract already toasted the failure.
    } finally {
      setPending(null);
    }
  }

  if (circleId === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">Invalid circle ID</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Circle IDs are numbers, like <code className="rounded bg-muted px-1">/app/circle/0</code>.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !circle) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">Circle not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? "This circle doesn't exist on testnet."}
        </p>
      </div>
    );
  }

  const { core, payout_order } = circle;
  const isMember = address ? payout_order.includes(address) : false;
  const isAdmin = address === core.admin;
  const isCreated = core.status.tag === "Created";
  const isActive = core.status.tag === "Active";
  const isCompleted = core.status.tag === "Completed";

  const contributedThisCycle = new Set(
    (events ?? [])
      .filter((e) => e.type === "contribution_made" && e.data.cycle === core.current_cycle)
      .map((e) => String(e.data.topicAddress)),
  );
  const strikesByMember = new Map<string, number>();
  for (const e of events ?? []) {
    if (e.type !== "member_defaulted") continue;
    const addr = String(e.data.topicAddress);
    strikesByMember.set(addr, (strikesByMember.get(addr) ?? 0) + 1);
  }

  const deadlinePassed = isActive && Date.now() >= Number(core.cycle_deadline) * 1000;
  const cycleComplete = isActive && core.contributed_count === core.member_count;
  const youContributedThisCycle = address ? contributedThisCycle.has(address) : false;

  const canJoin = isCreated && address && !isMember;
  const canStart = isCreated && isAdmin && payout_order.length >= 2;
  const canContribute = isActive && isMember && !youContributedThisCycle;
  const canTriggerPayout = isActive && (cycleComplete || deadlinePassed);
  const canClaimDeposit = isCompleted && isMember && core.deposit_amount > 0n;

  const inviteLink = `${window.location.origin}/app/circle/${circleId}`;

  function copyInvite() {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Circle #{circleId.toString()}</h1>
              <Badge variant={statusVariant(core.status)}>{statusLabel(core.status)}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-4" />
              {payout_order.length}
              {core.max_members ? ` / ${core.max_members}` : ""} members &middot;{" "}
              {formatTokenAmount(core.contribution_amount)} USDC per cycle
            </p>
          </div>
          {isActive && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Cycle {core.current_cycle} of {core.member_count}
              </p>
              <p className="flex items-center justify-end gap-1 text-sm font-medium">
                <Clock className="size-4" />
                {formatCountdown(core.cycle_deadline)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Members & payout order</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => refresh()} aria-label="Refresh">
                <RefreshCcw className="size-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isActive || isCompleted ? (
                <PayoutTimeline
                  payoutOrder={payout_order}
                  currentCycle={core.current_cycle}
                  address={address}
                />
              ) : (
                <div className="space-y-2">
                  {payout_order.map((member) => (
                    <MemberRow
                      key={member}
                      member={member}
                      isAdmin={member === core.admin}
                      isYou={member === address}
                      hasContributedThisCycle={null}
                      strikes={strikesByMember.get(member) ?? 0}
                    />
                  ))}
                </div>
              )}

              {isActive && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    This cycle's contributions
                  </p>
                  <div className="space-y-2">
                    {payout_order.map((member) => (
                      <MemberRow
                        key={member}
                        member={member}
                        isAdmin={member === core.admin}
                        isYou={member === address}
                        hasContributedThisCycle={contributedThisCycle.has(member)}
                        strikes={strikesByMember.get(member) ?? 0}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed events={events} loading={eventsLoading} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {walletStatus !== "connected" ? (
                <Button className="w-full" onClick={connect}>
                  <Wallet className="size-4" />
                  Connect Wallet
                </Button>
              ) : (
                <>
                  {canJoin && (
                    <Button
                      className="w-full"
                      disabled={pending !== null}
                      onClick={() =>
                        withAction("join", () =>
                          sendContract(
                            getContractClient(address!).join_circle({
                              circle_id: circleId,
                              member: address!,
                            }),
                            { pending: "Joining circle...", success: "You're in!" },
                          ),
                        )
                      }
                    >
                      {pending === "join" ? "Joining..." : "Join Circle"}
                    </Button>
                  )}

                  {canStart && (
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled={pending !== null}
                      onClick={() =>
                        withAction("start", () =>
                          sendContract(
                            getContractClient(address!).start_circle({
                              circle_id: circleId,
                              admin: address!,
                            }),
                            { pending: "Starting circle...", success: "Circle started!" },
                          ),
                        )
                      }
                    >
                      <PlayCircle className="size-4" />
                      {pending === "start" ? "Starting..." : "Start Circle"}
                    </Button>
                  )}

                  {canContribute && (
                    <Button
                      className="w-full"
                      disabled={pending !== null}
                      onClick={() =>
                        withAction("contribute", () =>
                          sendContract(
                            getContractClient(address!).contribute({
                              circle_id: circleId,
                              member: address!,
                            }),
                            {
                              pending: "Sending contribution...",
                              success: "Contribution recorded!",
                            },
                          ),
                        )
                      }
                    >
                      {pending === "contribute"
                        ? "Contributing..."
                        : `Contribute ${formatTokenAmount(core.contribution_amount)} USDC`}
                    </Button>
                  )}

                  {isActive && isMember && youContributedThisCycle && (
                    <p className="text-center text-xs text-muted-foreground">
                      You've contributed for this cycle. Waiting on the rest of the circle.
                    </p>
                  )}

                  {canTriggerPayout && (
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled={pending !== null}
                      onClick={() =>
                        withAction("payout", () =>
                          sendContract(
                            getContractClient(address ?? undefined).trigger_payout({
                              circle_id: circleId,
                            }),
                            { pending: "Settling cycle...", success: "Cycle settled!" },
                          ),
                        )
                      }
                    >
                      {pending === "payout" ? "Settling..." : "Settle This Cycle"}
                    </Button>
                  )}

                  {canClaimDeposit && (
                    <Button
                      className="w-full"
                      disabled={pending !== null}
                      onClick={() =>
                        withAction("claim", () =>
                          sendContract(
                            getContractClient(address!).claim_deposit({
                              circle_id: circleId,
                              member: address!,
                            }),
                            { pending: "Claiming deposit...", success: "Deposit claimed!" },
                          ),
                        )
                      }
                    >
                      {pending === "claim" ? "Claiming..." : "Claim Deposit Refund"}
                    </Button>
                  )}

                  {!canJoin &&
                    !canStart &&
                    !canContribute &&
                    !canTriggerPayout &&
                    !canClaimDeposit &&
                    !(isActive && isMember && youContributedThisCycle) && (
                      <p className="text-center text-xs text-muted-foreground">
                        {isCompleted
                          ? "This circle has completed its full rotation."
                          : "Nothing to do right now — check back after the next update."}
                      </p>
                    )}
                </>
              )}

              {isCreated && (
                <Button variant="outline" className="w-full" onClick={copyInvite}>
                  <Copy className="size-4" />
                  Copy invite link
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contribution</span>
                <span>{formatTokenAmount(core.contribution_amount)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit</span>
                <span>{formatTokenAmount(core.deposit_amount)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cycle length</span>
                <span>{formatDuration(core.cycle_interval)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin</span>
                <span className="font-mono">{truncateAddress(core.admin)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
