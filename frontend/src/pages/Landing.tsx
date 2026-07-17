import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Coins,
  UserPlus,
  Repeat,
  BadgeCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: UserPlus,
    title: "Create or join a circle",
    body: "Set the contribution amount, cycle length, and member cap — or join one someone shared with you. Everything is visible on-chain before anyone commits funds.",
  },
  {
    icon: Coins,
    title: "Contribute each cycle",
    body: "Members pay their contribution directly into the circle's contract in USDC. No cash, no notebook, no organizer holding the pool.",
  },
  {
    icon: Repeat,
    title: "Payout rotates automatically",
    body: "Once everyone's in — or the cycle deadline passes — anyone can settle the round. The contract sends the pool to the scheduled recipient and advances the rotation itself.",
  },
  {
    icon: BadgeCheck,
    title: "Deposits keep everyone honest",
    body: "A refundable deposit backs every member's commitment. Miss a cycle and arrears are charged against it — a real cost for defaulting, not just a warning.",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "No organizer to trust",
    body: "Rotation order, contribution tracking, and payouts are enforced by a Soroban smart contract — not a person holding everyone's money.",
  },
  {
    icon: Zap,
    title: "Built for small, frequent payments",
    body: "Stellar's sub-cent fees and ~5 second finality make weekly or monthly micro-contributions practical, unlike chains where gas would eat the value.",
  },
  {
    icon: Users,
    title: "Works like the circles you already run",
    body: "Ajo, esusu, tanda, chama, susu — same social structure your group already trusts, just with transparent, tamper-proof enforcement.",
  },
];

export function Landing() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            Live on Stellar Testnet
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Rotating savings circles, without the trust problem.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
            Circlo replaces the organizer's notebook with a smart contract. Contribution
            tracking, payout order, and enforcement all happen on-chain — your circle keeps its
            social structure, minus the risk of one person disappearing with the pool.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/app">
                Launch App
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com/Abidoyesimze/Circlo"
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">How it works</h2>
            <p className="mt-3 text-muted-foreground">
              Four steps, entirely enforced by the Circlo contract on Stellar.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {steps.map((step, i) => (
              <Card key={step.title} className="relative overflow-hidden">
                <CardContent className="flex gap-4 p-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="size-5" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">
                      Step {i + 1}
                    </div>
                    <h3 className="font-medium">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">Why Stellar</h2>
            <p className="mt-3 text-muted-foreground">
              The problem is trust — Stellar's fees, speed, and stablecoin rails make solving it
              with a smart contract practical instead of prohibitively expensive.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="text-center sm:text-left">
                <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground sm:mx-0">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-medium">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">Ready to run your circle on-chain?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Connect a Stellar wallet, create a circle, and invite the people who already trust
            each other — the contract handles the rest.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link to="/app">
              Launch App
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
