import * as React from "react";
import {
  isConnected as freighterIsConnected,
  isAllowed as freighterIsAllowed,
  requestAccess,
  getAddress,
  getNetwork,
} from "@stellar/freighter-api";
import { toast } from "sonner";

import { NETWORK_PASSPHRASE } from "@/config";

const LAST_ADDRESS_KEY = "circlo:lastAddress";

type WalletStatus =
  | "idle"
  | "checking"
  | "not-installed"
  | "disconnected"
  | "connected";

interface WalletContextValue {
  status: WalletStatus;
  address: string | null;
  isWrongNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshNetwork: () => Promise<void>;
}

const WalletContext = React.createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<WalletStatus>("idle");
  const [address, setAddress] = React.useState<string | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = React.useState(false);

  const checkNetwork = React.useCallback(async () => {
    const { network, networkPassphrase, error } = await getNetwork();
    if (error) return;
    setIsWrongNetwork(networkPassphrase !== NETWORK_PASSPHRASE);
    return network;
  }, []);

  const connect = React.useCallback(async () => {
    setStatus("checking");
    const { isConnected, error: connErr } = await freighterIsConnected();
    if (connErr || !isConnected) {
      setStatus("not-installed");
      return;
    }

    const { address: addr, error } = await requestAccess();
    if (error || !addr) {
      setStatus("disconnected");
      toast.error("Couldn't connect to Freighter", {
        description: error?.message ?? "Connection request was rejected.",
      });
      return;
    }

    await checkNetwork();
    setAddress(addr);
    setStatus("connected");
    localStorage.setItem(LAST_ADDRESS_KEY, addr);
  }, [checkNetwork]);

  const disconnect = React.useCallback(() => {
    setAddress(null);
    setStatus("disconnected");
    localStorage.removeItem(LAST_ADDRESS_KEY);
  }, []);

  // Silent restore on load: only re-populate if Freighter is installed AND
  // this origin already has permission, so we never surprise-prompt.
  React.useEffect(() => {
    let cancelled = false;

    async function restore() {
      setStatus("checking");
      const remembered = localStorage.getItem(LAST_ADDRESS_KEY);
      if (!remembered) {
        setStatus("disconnected");
        return;
      }

      const { isConnected, error: connErr } = await freighterIsConnected();
      if (cancelled) return;
      if (connErr || !isConnected) {
        setStatus("not-installed");
        return;
      }

      const { isAllowed } = await freighterIsAllowed();
      if (cancelled) return;
      if (!isAllowed) {
        setStatus("disconnected");
        return;
      }

      const { address: addr, error } = await getAddress();
      if (cancelled) return;
      if (error || !addr) {
        setStatus("disconnected");
        return;
      }

      await checkNetwork();
      if (cancelled) return;
      setAddress(addr);
      setStatus("connected");
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [checkNetwork]);

  const value = React.useMemo(
    () => ({
      status,
      address,
      isWrongNetwork,
      connect,
      disconnect,
      refreshNetwork: async () => {
        await checkNetwork();
      },
    }),
    [status, address, isWrongNetwork, connect, disconnect, checkNetwork],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
