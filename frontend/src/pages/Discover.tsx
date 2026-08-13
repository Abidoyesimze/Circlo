import * as React from "react";
import { Compass } from "lucide-react";

import { useWallet } from "@/contexts/WalletContext";
import { useDiscoverCircles } from "@/hooks/useDiscoverCircles";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CircleCard } from "@/components/circle/CircleCard";

type Filter = "all" | "Created" | "Active" | "Completed";

export function Discover() {
  const { address } = useWallet();
  const { circles, loading, error } = useDiscoverCircles();
  const [filter, setFilter] = React.useState<Filter>("all");

  const filtered =
    filter === "all" ? circles : circles.filter((c) => c.view.core.status.tag === filter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Discover Circles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recently created circles on Circlo. Showing circles created in roughly the last 8
          hours &mdash; join one that's still forming, or browse what's active.
        </p>
      </div>

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as Filter)}
        className="mt-6"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Created">Forming</TabsTrigger>
          <TabsTrigger value="Active">Active</TabsTrigger>
          <TabsTrigger value="Completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          )}

          {!loading && error && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
            </Card>
          )}

          {!loading && !error && filtered.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
                <Compass className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No circles to show here yet. Circles created more than ~8 hours ago age out of
                  this view &mdash; try Create a Circle to start one, or check back after a fresh
                  one is created.
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(({ id, view }) => (
                <CircleCard key={id.toString()} id={id} view={view} address={address} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
