import { Link } from "react-router-dom";
import { LogOut, Wallet } from "lucide-react";

import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { truncateAddress } from "@/lib/utils";
import { EXPLORER_ADDRESS_URL } from "@/config";

export function WalletButton() {
  const { status, address, connect, disconnect } = useWallet();

  if (status === "connected" && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="font-mono">
            <span className="size-2 rounded-full bg-success" />
            {truncateAddress(address)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Connected wallet</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <a href={EXPLORER_ADDRESS_URL(address)} target="_blank" rel="noreferrer">
              View on Stellar Expert
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={disconnect} className="text-destructive">
            <LogOut className="size-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (status === "not-installed") {
    return (
      <Button asChild size="sm" variant="outline">
        <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
          Install Freighter
        </a>
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={connect}
      disabled={status === "checking"}
    >
      <Wallet className="size-4" />
      {status === "checking" ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}

export function WrongNetworkBanner() {
  const { status, isWrongNetwork } = useWallet();
  if (status !== "connected" || !isWrongNetwork) return null;

  return (
    <div className="w-full bg-warning/20 px-4 py-2 text-center text-sm text-warning-foreground">
      Your wallet is on the wrong network. Switch Freighter to{" "}
      <span className="font-medium">Test SDF Network ; September 2015</span> to use Circlo.{" "}
      <Link to="/" className="underline">
        Learn more
      </Link>
    </div>
  );
}
