import { Activity, Coins, RefreshCcw, Repeat, Users } from "lucide-react";

import { useProtocolStats } from "@/hooks/useProtocolStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityFeed } from "@/components/circle/ActivityFeed";
import { formatTokenAmount } from "@/lib/utils";

export function Stats() {
  const { stats, loading, error, refresh } = useProtocolStats();

  const tiles = [
    {
      label: "Circles created",
      value: stats?.circlesCreated ?? 0,
      icon: Users,
    },
    {
      label: "Contributions made",
      value: stats?.contributionsMade ?? 0,
      icon: Coins,
    },
    {
      label: "Contribution volume",
      value: stats ? `${formatTokenAmount(stats.contributionVolume)} USDC` : "0 USDC",
      icon: Coins,
    },
    {
      label: "Payouts settled",
      value: stats?.payoutsTriggered ?? 0,
      icon: Repeat,
    },
    {
      label: "Unique wallets active",
      value: stats?.uniqueWallets ?? 0,
      icon: Activity,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Protocol Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real on-chain usage on Stellar testnet, over roughly the last 8 hours of ledger
            history.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          <RefreshCcw className="size-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mt-6 border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {loading
          ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : tiles.map((tile) => (
              <Card key={tile.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <tile.icon className="size-3.5" />
                    {tile.label}
                  </div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{tile.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed events={stats?.events ?? null} loading={loading} showCircleId />
        </CardContent>
      </Card>
    </div>
  );
}
