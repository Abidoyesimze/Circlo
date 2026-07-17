import type { AssembledTransaction, Result } from "@stellar/stellar-sdk/contract";
import { toast } from "sonner";

import { EXPLORER_TX_URL } from "@/config";

export class ContractCallError extends Error {}

function unwrapResult<T>(result: Result<T>): T {
  if (result.isErr()) {
    // The generated client already resolves the numeric contract error code
    // to its `#[contracterror]` variant name (e.g. "NotAdmin") via the spec.
    throw new ContractCallError(result.unwrapErr().message);
  }
  return result.unwrap();
}

/** For read-only views: simulate and unwrap, no signature required. */
export async function readContract<T>(
  promise: Promise<AssembledTransaction<Result<T>>>,
): Promise<T> {
  const tx = await promise;
  return unwrapResult(tx.result);
}

/** get_my_circles returns a plain value (not wrapped in Result). */
export async function readContractPlain<T>(
  promise: Promise<AssembledTransaction<T>>,
): Promise<T> {
  const tx = await promise;
  return tx.result;
}

/**
 * For state-changing calls: simulates, prompts Freighter for a signature,
 * submits, and surfaces the whole lifecycle as toasts so the user always
 * knows what's happening with their wallet.
 */
export async function sendContract<T>(
  promise: Promise<AssembledTransaction<Result<T>>>,
  labels: { pending: string; success: string },
): Promise<T> {
  const toastId = toast.loading(labels.pending);
  try {
    const tx = await promise;
    const sent = await tx.signAndSend();
    const value = unwrapResult(sent.result);
    const hash = sent.sendTransactionResponse?.hash;
    toast.success(labels.success, {
      id: toastId,
      description: hash ? "View on explorer" : undefined,
      action: hash
        ? {
            label: "View",
            onClick: () => window.open(EXPLORER_TX_URL(hash), "_blank"),
          }
        : undefined,
    });
    return value;
  } catch (err) {
    const message =
      err instanceof ContractCallError
        ? humanizeContractError(err.message)
        : err instanceof Error
          ? humanizeSimulationError(err.message)
          : "Something went wrong";
    toast.error("Transaction failed", { id: toastId, description: message });
    throw err;
  }
}

function humanizeContractError(code: string): string {
  const map: Record<string, string> = {
    NotAdmin: "Only the circle's admin can do that.",
    AlreadyMember: "You've already joined this circle.",
    CircleFull: "This circle already has its full member count.",
    InvalidMaxMembers: "Member limit must be between 2 and 20.",
    CircleNotFound: "This circle doesn't exist.",
    InvalidStatus: "That action isn't available at this stage of the circle.",
    AlreadyContributed: "You've already contributed for this cycle.",
    NotMember: "You need to join this circle first.",
    NotEnoughMembers: "A circle needs at least 2 members to start.",
    CycleNotReadyForPayout: "This cycle isn't ready to settle yet.",
    CircleNotCompleted: "Deposits unlock once the circle completes.",
    AlreadyClaimed: "This deposit has already been claimed.",
    InvalidAmount: "Enter an amount greater than zero.",
    InvalidInterval: "Enter a cycle length greater than zero.",
  };
  return map[code] ?? code;
}

/**
 * Errors that never reach our own contract's Result::Err — a failed cross-
 * contract call into the token contract (no trustline, insufficient
 * balance) or a rejected Freighter signature — surface as a raw simulation/
 * submission error instead. These come back as a wall of diagnostic-event
 * XDR dumps, which is useless to a user; recognize the common cases and
 * otherwise show a short, truncated line instead of the whole blob.
 */
function humanizeSimulationError(raw: string): string {
  if (/trustline entry is missing/i.test(raw)) {
    return "Your wallet doesn't have a testnet USDC trustline yet. Get testnet USDC — which sets up the trustline for you — at faucet.circle.com, then try again.";
  }
  if (/insufficient balance|balance is not sufficient/i.test(raw)) {
    return "Your USDC balance isn't enough for this. Get more testnet USDC at faucet.circle.com.";
  }
  if (/user declined|rejected|user cancelled/i.test(raw)) {
    return "Signature request was declined in Freighter.";
  }
  if (/underfunded/i.test(raw)) {
    return "Not enough XLM in your wallet to cover the network fee.";
  }

  const firstLine = raw.split("\n")[0]?.trim() ?? raw;
  return firstLine.length > 160 ? `${firstLine.slice(0, 160)}…` : firstLine;
}
