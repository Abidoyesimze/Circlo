import { Check, Clock, ShieldAlert } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, truncateAddress } from "@/lib/utils";

interface MemberRowProps {
  member: string;
  isAdmin: boolean;
  isYou: boolean;
  hasContributedThisCycle: boolean | null;
  strikes: number;
}

export function MemberRow({
  member,
  isAdmin,
  isYou,
  hasContributedThisCycle,
  strikes,
}: MemberRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
      <Avatar>
        <AvatarFallback>{member.slice(4, 6)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-mono text-sm">{truncateAddress(member, 6)}</span>
          {isYou && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              You
            </Badge>
          )}
          {isAdmin && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              Admin
            </Badge>
          )}
        </div>
        {strikes > 0 && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
            <ShieldAlert className="size-3" />
            {strikes} missed cycle{strikes === 1 ? "" : "s"}
          </p>
        )}
      </div>
      {hasContributedThisCycle !== null && (
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
            hasContributedThisCycle
              ? "bg-success/15 text-success"
              : "bg-warning/20 text-warning-foreground",
          )}
        >
          {hasContributedThisCycle ? (
            <>
              <Check className="size-3" /> Paid
            </>
          ) : (
            <>
              <Clock className="size-3" /> Pending
            </>
          )}
        </div>
      )}
    </div>
  );
}
