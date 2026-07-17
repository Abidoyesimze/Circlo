import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusCircle, Search, Wallet } from "lucide-react";

import { useWallet } from "@/contexts/WalletContext";
import { useMyCircles } from "@/hooks/useMyCircles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleCard } from "@/components/circle/CircleCard";

export function Dashboard() {
  const { status, address, connect } = useWallet();
  const { circles, loading, error } = useMyCircles(address);
  const [joinId, setJoinId] = React.useState("");
  const navigate = useNavigate();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = joinId.trim();
    if (!trimmed || Number.isNaN(Number(trimmed))) return;
    navigate(`/app/circle/${trimmed}`);
  }

  if (status !== "connected") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wallet className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">Connect your wallet</h1>
        <p className="text-sm text-muted-foreground">
          Connect Freighter to view your circles, create a new one, or join one you've been
          invited to.
        </p>
        <Button onClick={connect} disabled={status === "checking"}>
          {status === "checking" ? "Connecting..." : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Circles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Circles you've created or joined with this wallet.
          </p>
        </div>
        <Button asChild>
          <Link to="/app/create">
            <PlusCircle className="size-4" />
            Create a Circle
          </Link>
        </Button>
      </div>

      <form
        onSubmit={handleJoin}
        className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Join a circle by ID"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            inputMode="numeric"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!joinId.trim()}>
          Go to circle
        </Button>
      </form>

      <div className="mt-8">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        )}

        {!loading && error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && circles.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <p className="text-sm text-muted-foreground">
                You haven't joined any circles yet. Create one, or ask someone for their circle's
                ID to join it.
              </p>
              <Button asChild size="sm">
                <Link to="/app/create">
                  <PlusCircle className="size-4" />
                  Create your first circle
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && circles.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {circles.map(({ id, view }) => (
              <CircleCard key={id.toString()} id={id} view={view} address={address} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
