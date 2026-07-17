import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info } from "lucide-react";

import { useWallet } from "@/contexts/WalletContext";
import { getContractClient } from "@/lib/contract";
import { sendContract } from "@/lib/tx";
import { parseTokenAmount, truncateAddress } from "@/lib/utils";
import { EXPLORER_CONTRACT_URL, TESTNET_USDC_ADDRESS } from "@/config";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CYCLE_OPTIONS = [
  { label: "Daily (testing)", seconds: 24 * 60 * 60 },
  { label: "Weekly", seconds: 7 * 24 * 60 * 60 },
  { label: "Bi-weekly", seconds: 14 * 24 * 60 * 60 },
  { label: "Monthly", seconds: 30 * 24 * 60 * 60 },
];

const formSchema = z.object({
  contributionAmount: z
    .string()
    .min(1, "Required")
    .refine((v) => Number(v) > 0, "Must be greater than 0"),
  depositAmount: z
    .string()
    .refine((v) => v === "" || Number(v) >= 0, "Must be zero or more"),
  cycleSeconds: z.string().min(1),
  maxMembers: z
    .string()
    .min(1, "Required")
    .refine((v) => Number(v) >= 2 && Number(v) <= 20, "Must be between 2 and 20"),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateCircle() {
  const { status, address, connect } = useWallet();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contributionAmount: "100",
      depositAmount: "50",
      cycleSeconds: String(CYCLE_OPTIONS[1].seconds),
      maxMembers: "5",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!address) return;
    setSubmitting(true);
    try {
      const client = getContractClient(address);
      const circleId = await sendContract(
        client.create_circle({
          admin: address,
          token: TESTNET_USDC_ADDRESS,
          contribution_amount: parseTokenAmount(values.contributionAmount),
          deposit_amount: parseTokenAmount(values.depositAmount || "0"),
          cycle_interval: BigInt(values.cycleSeconds),
          max_members: Number(values.maxMembers),
        }),
        { pending: "Creating your circle...", success: "Circle created!" },
      );
      navigate(`/app/circle/${circleId}`);
    } catch {
      // sendContract already surfaced a toast; stay on the page so the user can retry.
    } finally {
      setSubmitting(false);
    }
  }

  if (status !== "connected") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">Connect your wallet</h1>
        <p className="text-sm text-muted-foreground">
          You'll need a connected wallet to create a circle.
        </p>
        <Button onClick={connect} disabled={status === "checking"}>
          {status === "checking" ? "Connecting..." : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Create a Circle</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You'll be added as the first member. Once at least one more person joins, you can start
        the rotation.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Circle terms</CardTitle>
          <CardDescription>
            These can't be changed once the circle starts, so double-check with your group first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contributionAmount">Contribution amount (USDC)</Label>
                <Input
                  id="contributionAmount"
                  inputMode="decimal"
                  {...register("contributionAmount")}
                />
                {errors.contributionAmount && (
                  <p className="text-xs text-destructive">{errors.contributionAmount.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="depositAmount">Security deposit (USDC)</Label>
                <Input id="depositAmount" inputMode="decimal" {...register("depositAmount")} />
                {errors.depositAmount && (
                  <p className="text-xs text-destructive">{errors.depositAmount.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cycleSeconds">Cycle length</Label>
                <Select id="cycleSeconds" {...register("cycleSeconds")}>
                  {CYCLE_OPTIONS.map((opt) => (
                    <option key={opt.seconds} value={opt.seconds}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maxMembers">Max members</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  min={2}
                  max={20}
                  {...register("maxMembers")}
                />
                {errors.maxMembers && (
                  <p className="text-xs text-destructive">{errors.maxMembers.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0" />
              <p>
                The deposit is refundable once the circle completes, minus arrears for any missed
                contributions. It's what gives the fallback penalty for defaulting real teeth.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              <span>Settlement token</span>
              <a
                href={EXPLORER_CONTRACT_URL(TESTNET_USDC_ADDRESS)}
                target="_blank"
                rel="noreferrer"
                className="font-mono hover:text-foreground"
              >
                Testnet USDC ({truncateAddress(TESTNET_USDC_ADDRESS)})
              </a>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating..." : "Create Circle"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
