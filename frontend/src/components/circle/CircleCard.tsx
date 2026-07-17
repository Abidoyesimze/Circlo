import { Link } from "react-router-dom";
import type { CircleView } from "circlo-client";
import { Users, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatTokenAmount } from "@/lib/utils";
import { statusLabel, statusVariant, formatCountdown } from "@/lib/circle";

interface CircleCardProps {
  id: bigint;
  view: CircleView;
  address?: string | null;
}

export function CircleCard({ id, view, address }: CircleCardProps) {
  const { core, payout_order } = view;
  const memberCount = core.member_count || payout_order.length;
  const isMember = address ? payout_order.includes(address) : false;
  const progress =
    core.member_count > 0
      ? Math.min(100, (core.contributed_count / core.member_count) * 100)
      : 0;

  return (
    <Link to={`/app/circle/${id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Circle #{id.toString()}</CardTitle>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              {memberCount} member{memberCount === 1 ? "" : "s"}
            </p>
          </div>
          <Badge variant={statusVariant(core.status)}>{statusLabel(core.status)}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Contribution</p>
              <p className="font-medium">{formatTokenAmount(core.contribution_amount)} USDC</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cycle</p>
              <p className="font-medium">
                {core.current_cycle || 0} / {memberCount || "?"}
              </p>
            </div>
          </div>

          {core.status.tag === "Active" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {core.contributed_count}/{core.member_count} contributed this cycle
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatCountdown(core.cycle_deadline)}
                </span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {!isMember && address && core.status.tag === "Created" && (
            <Badge variant="secondary" className="w-fit">
              Not joined yet
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
