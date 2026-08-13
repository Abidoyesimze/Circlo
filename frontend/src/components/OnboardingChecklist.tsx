import { Check, Circle as CircleIcon } from "lucide-react";

import { useWallet } from "@/contexts/WalletContext";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  done: boolean;
  href: string;
  linkLabel: string;
}

/** Only renders when the connected wallet is actually missing a
 * prerequisite (funding, trustline, or USDC balance) — silent once
 * everything's in place, so it never lingers as clutter. */
export function OnboardingChecklist() {
  const { status: walletStatus, address } = useWallet();
  const { status, loading } = useAccountStatus(walletStatus === "connected" ? address : null);

  if (walletStatus !== "connected" || loading || !status) return null;

  const steps: Step[] = [
    {
      label: "Fund your wallet with testnet XLM (for fees)",
      done: status.exists && status.xlmBalance > 1,
      href: "https://friendbot.stellar.org",
      linkLabel: "Friendbot",
    },
    {
      label: "Add a USDC trustline in Freighter",
      done: status.hasUsdcTrustline,
      href: "https://developers.circle.com/stablecoins/quickstart-setup-usdc-trustline-stellar",
      linkLabel: "How to",
    },
    {
      label: "Get testnet USDC",
      done: status.hasUsdcTrustline && status.usdcBalance > 0,
      href: "https://faucet.circle.com",
      linkLabel: "Faucet",
    },
  ];

  const allDone = steps.every((s) => s.done);
  if (allDone) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">Finish setting up your wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-3 text-sm">
            {step.done ? (
              <Check className="size-4 shrink-0 text-success" />
            ) : (
              <CircleIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className={cn("flex-1", step.done && "text-muted-foreground line-through")}>
              {step.label}
            </span>
            {!step.done && (
              <a
                href={step.href}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {step.linkLabel}
              </a>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
