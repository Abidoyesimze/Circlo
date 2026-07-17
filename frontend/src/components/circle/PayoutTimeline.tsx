import { Check, Circle as CircleIcon } from "lucide-react";

import { cn, truncateAddress } from "@/lib/utils";

interface PayoutTimelineProps {
  payoutOrder: string[];
  currentCycle: number;
  address?: string | null;
}

export function PayoutTimeline({ payoutOrder, currentCycle, address }: PayoutTimelineProps) {
  return (
    <ol className="space-y-2">
      {payoutOrder.map((member, i) => {
        const cycle = i + 1;
        const isPast = currentCycle > 0 && cycle < currentCycle;
        const isCurrent = cycle === currentCycle;
        const isYou = address && member === address;

        return (
          <li
            key={`${member}-${i}`}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              isCurrent && "border-primary bg-primary/5",
              isPast && "border-border bg-muted/40 text-muted-foreground",
              !isPast && !isCurrent && "border-border",
            )}
          >
            <div
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                isPast && "bg-success/20 text-success",
                isCurrent && "bg-primary text-primary-foreground",
                !isPast && !isCurrent && "bg-secondary text-secondary-foreground",
              )}
            >
              {isPast ? <Check className="size-3.5" /> : cycle}
            </div>
            <span className="font-mono">{truncateAddress(member)}</span>
            {isYou && (
              <span className="text-xs font-medium text-primary">You</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {isPast ? "Paid out" : isCurrent ? "This cycle" : `Cycle ${cycle}`}
            </span>
            {!isPast && !isCurrent && (
              <CircleIcon className="size-3 text-muted-foreground" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
