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
          ? err.message
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
