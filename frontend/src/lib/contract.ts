import { Client } from "circlo-client";
import { signTransaction } from "@stellar/freighter-api";

import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from "@/config";

/**
 * Builds a typed contract client bound to the connected wallet. Read-only
 * calls work with `publicKey` alone; anything that needs `signAndSend()`
 * uses Freighter's `signTransaction`, whose signature the generated client
 * expects verbatim.
 */
export function getContractClient(publicKey?: string) {
  return new Client({
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey,
    signTransaction,
  });
}
