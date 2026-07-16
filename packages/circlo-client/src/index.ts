import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CC3JCXU6XMMBZDRSFLNE36DQUGIY3HQ3HAIXGFHJBF4TRQD6TFMXS53P",
  }
} as const

export type DataKey = {tag: "NextId", values: void} | {tag: "Circle", values: readonly [u64]} | {tag: "PayoutOrder", values: readonly [u64]} | {tag: "Contribution", values: readonly [u64, u32, string]} | {tag: "Deposit", values: readonly [u64, string]} | {tag: "DepositClaimed", values: readonly [u64, string]} | {tag: "Arrears", values: readonly [u64, string]} | {tag: "Strikes", values: readonly [u64, string]} | {tag: "MemberCircles", values: readonly [string]};


/**
 * Scalar, hot-path state for a circle. Rewritten on every `contribute()`
 * and `trigger_payout()` call, but deliberately small — the member list
 * lives in its own `PayoutOrder` entry so it's never touched by a
 * contribution.
 */
export interface CircleCore {
  admin: string;
  contributed_count: u32;
  contribution_amount: i128;
  current_cycle: u32;
  cycle_deadline: u64;
  cycle_interval: u64;
  deposit_amount: i128;
  id: u64;
  /**
 * Configured cap on membership, enforced only while `status == Created`.
 */
max_members: u32;
  /**
 * Final member count, frozen at `start_circle`. Drives all rotation
 * math once `Active` — independent of `max_members`, since a circle
 * may start with fewer members than its cap.
 */
member_count: u32;
  status: CircleStatus;
  token: string;
}


/**
 * Read-only view returned to callers (frontend) combining the scalar core
 * with the current payout order, for a single round-trip.
 */
export interface CircleView {
  core: CircleCore;
  payout_order: Array<string>;
}

export type CircleStatus = {tag: "Created", values: void} | {tag: "Active", values: void} | {tag: "Completed", values: void};

export const Errors = {
  /**
   * Caller does not match the circle's stored admin.
   */
  1: {message:"NotAdmin"},
  /**
   * Address is already a member of this circle.
   */
  2: {message:"AlreadyMember"},
  /**
   * Circle already has `max_members` members.
   */
  3: {message:"CircleFull"},
  /**
   * `max_members` is outside the allowed [2, MAX_MEMBERS_CAP] range.
   */
  4: {message:"InvalidMaxMembers"},
  /**
   * No circle exists with the given id.
   */
  5: {message:"CircleNotFound"},
  /**
   * Action isn't valid for the circle's current status.
   */
  6: {message:"InvalidStatus"},
  /**
   * Member already has a recorded contribution for the current cycle.
   */
  7: {message:"AlreadyContributed"},
  /**
   * Address is not a member of this circle.
   */
  8: {message:"NotMember"},
  /**
   * A circle needs at least 2 members before it can be started.
   */
  9: {message:"NotEnoughMembers"},
  /**
   * `trigger_payout` called before the cycle is complete or the deadline
   * has passed.
   */
  10: {message:"CycleNotReadyForPayout"},
  /**
   * `claim_deposit` called before the circle has completed.
   */
  11: {message:"CircleNotCompleted"},
  /**
   * Deposit for this member/circle has already been claimed.
   */
  12: {message:"AlreadyClaimed"},
  /**
   * `contribution_amount` or `deposit_amount` must be positive.
   */
  13: {message:"InvalidAmount"},
  /**
   * `cycle_interval` must be positive.
   */
  14: {message:"InvalidInterval"}
}











export interface Client {
  /**
   * Construct and simulate a contribute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Records a member's contribution for the current cycle.
   */
  contribute: ({circle_id, member}: {circle_id: u64, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read-only status snapshot for the frontend.
   */
  get_status: ({circle_id}: {circle_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<CircleView>>>

  /**
   * Construct and simulate a join_circle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Joins an existing circle. Only possible while the circle is still
   * `Created`. Pays the circle's deposit, if any.
   */
  join_circle: ({circle_id, member}: {circle_id: u64, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a start_circle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Starts the rotation. Admin-only. Freezes membership and payout order
   * (aside from in-place demotion of defaulters once the circle is
   * running).
   */
  start_circle: ({circle_id, admin}: {circle_id: u64, admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a claim_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Refunds a member's deposit (less any arrears charged against them)
   * once the circle has completed. Pull-based: each member claims their
   * own refund rather than the contract pushing refunds to everyone in
   * one transaction, which wouldn't scale.
   */
  claim_deposit: ({circle_id, member}: {circle_id: u64, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a create_circle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Creates a new circle. The admin is automatically added as its first
   * member (and, like everyone else, must pay the deposit if one is
   * configured). Returns the new circle's id.
   */
  create_circle: ({admin, token, contribution_amount, deposit_amount, cycle_interval, max_members}: {admin: string, token: string, contribution_amount: i128, deposit_amount: i128, cycle_interval: u64, max_members: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a get_my_circles transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Circle ids a member has ever joined.
   */
  get_my_circles: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<u64>>>

  /**
   * Construct and simulate a trigger_payout transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Permissionless: settles the current cycle once it's complete, or once
   * its deadline has passed (whichever comes first). Pays the scheduled
   * recipient whatever was actually collected (the full pool on the
   * happy path, a partial pool if some members missed the deadline).
   * Members who missed the deadline are charged arrears against their
   * deposit, struck, and demoted to the back of the remaining rotation.
   * Never reverts into a stuck state: an empty cycle just advances with a
   * `CycleSkipped` event instead of a zero-amount transfer.
   */
  trigger_payout: ({circle_id}: {circle_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a check_cycle_complete transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pure view: has every member contributed for the current cycle?
   */
  check_cycle_complete: ({circle_id}: {circle_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAADZSZWNvcmRzIGEgbWVtYmVyJ3MgY29udHJpYnV0aW9uIGZvciB0aGUgY3VycmVudCBjeWNsZS4AAAAAAApjb250cmlidXRlAAAAAAACAAAAAAAAAAljaXJjbGVfaWQAAAAAAAAGAAAAAAAAAAZtZW1iZXIAAAAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAACtSZWFkLW9ubHkgc3RhdHVzIHNuYXBzaG90IGZvciB0aGUgZnJvbnRlbmQuAAAAAApnZXRfc3RhdHVzAAAAAAABAAAAAAAAAAljaXJjbGVfaWQAAAAAAAAGAAAAAQAAA+kAAAfQAAAACkNpcmNsZVZpZXcAAAAAAAM=",
        "AAAAAAAAAG9Kb2lucyBhbiBleGlzdGluZyBjaXJjbGUuIE9ubHkgcG9zc2libGUgd2hpbGUgdGhlIGNpcmNsZSBpcyBzdGlsbApgQ3JlYXRlZGAuIFBheXMgdGhlIGNpcmNsZSdzIGRlcG9zaXQsIGlmIGFueS4AAAAAC2pvaW5fY2lyY2xlAAAAAAIAAAAAAAAACWNpcmNsZV9pZAAAAAAAAAYAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAI1TdGFydHMgdGhlIHJvdGF0aW9uLiBBZG1pbi1vbmx5LiBGcmVlemVzIG1lbWJlcnNoaXAgYW5kIHBheW91dCBvcmRlcgooYXNpZGUgZnJvbSBpbi1wbGFjZSBkZW1vdGlvbiBvZiBkZWZhdWx0ZXJzIG9uY2UgdGhlIGNpcmNsZSBpcwpydW5uaW5nKS4AAAAAAAAMc3RhcnRfY2lyY2xlAAAAAgAAAAAAAAAJY2lyY2xlX2lkAAAAAAAABgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAPBSZWZ1bmRzIGEgbWVtYmVyJ3MgZGVwb3NpdCAobGVzcyBhbnkgYXJyZWFycyBjaGFyZ2VkIGFnYWluc3QgdGhlbSkKb25jZSB0aGUgY2lyY2xlIGhhcyBjb21wbGV0ZWQuIFB1bGwtYmFzZWQ6IGVhY2ggbWVtYmVyIGNsYWltcyB0aGVpcgpvd24gcmVmdW5kIHJhdGhlciB0aGFuIHRoZSBjb250cmFjdCBwdXNoaW5nIHJlZnVuZHMgdG8gZXZlcnlvbmUgaW4Kb25lIHRyYW5zYWN0aW9uLCB3aGljaCB3b3VsZG4ndCBzY2FsZS4AAAANY2xhaW1fZGVwb3NpdAAAAAAAAAIAAAAAAAAACWNpcmNsZV9pZAAAAAAAAAYAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAPpAAAACwAAAAM=",
        "AAAAAAAAAK1DcmVhdGVzIGEgbmV3IGNpcmNsZS4gVGhlIGFkbWluIGlzIGF1dG9tYXRpY2FsbHkgYWRkZWQgYXMgaXRzIGZpcnN0Cm1lbWJlciAoYW5kLCBsaWtlIGV2ZXJ5b25lIGVsc2UsIG11c3QgcGF5IHRoZSBkZXBvc2l0IGlmIG9uZSBpcwpjb25maWd1cmVkKS4gUmV0dXJucyB0aGUgbmV3IGNpcmNsZSdzIGlkLgAAAAAAAA1jcmVhdGVfY2lyY2xlAAAAAAAABgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAAE2NvbnRyaWJ1dGlvbl9hbW91bnQAAAAACwAAAAAAAAAOZGVwb3NpdF9hbW91bnQAAAAAAAsAAAAAAAAADmN5Y2xlX2ludGVydmFsAAAAAAAGAAAAAAAAAAttYXhfbWVtYmVycwAAAAAEAAAAAQAAA+kAAAAGAAAAAw==",
        "AAAAAAAAACRDaXJjbGUgaWRzIGEgbWVtYmVyIGhhcyBldmVyIGpvaW5lZC4AAAAOZ2V0X215X2NpcmNsZXMAAAAAAAEAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAPqAAAABg==",
        "AAAAAAAAAg5QZXJtaXNzaW9ubGVzczogc2V0dGxlcyB0aGUgY3VycmVudCBjeWNsZSBvbmNlIGl0J3MgY29tcGxldGUsIG9yIG9uY2UKaXRzIGRlYWRsaW5lIGhhcyBwYXNzZWQgKHdoaWNoZXZlciBjb21lcyBmaXJzdCkuIFBheXMgdGhlIHNjaGVkdWxlZApyZWNpcGllbnQgd2hhdGV2ZXIgd2FzIGFjdHVhbGx5IGNvbGxlY3RlZCAodGhlIGZ1bGwgcG9vbCBvbiB0aGUKaGFwcHkgcGF0aCwgYSBwYXJ0aWFsIHBvb2wgaWYgc29tZSBtZW1iZXJzIG1pc3NlZCB0aGUgZGVhZGxpbmUpLgpNZW1iZXJzIHdobyBtaXNzZWQgdGhlIGRlYWRsaW5lIGFyZSBjaGFyZ2VkIGFycmVhcnMgYWdhaW5zdCB0aGVpcgpkZXBvc2l0LCBzdHJ1Y2ssIGFuZCBkZW1vdGVkIHRvIHRoZSBiYWNrIG9mIHRoZSByZW1haW5pbmcgcm90YXRpb24uCk5ldmVyIHJldmVydHMgaW50byBhIHN0dWNrIHN0YXRlOiBhbiBlbXB0eSBjeWNsZSBqdXN0IGFkdmFuY2VzIHdpdGggYQpgQ3ljbGVTa2lwcGVkYCBldmVudCBpbnN0ZWFkIG9mIGEgemVyby1hbW91bnQgdHJhbnNmZXIuAAAAAAAOdHJpZ2dlcl9wYXlvdXQAAAAAAAEAAAAAAAAACWNpcmNsZV9pZAAAAAAAAAYAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAD5QdXJlIHZpZXc6IGhhcyBldmVyeSBtZW1iZXIgY29udHJpYnV0ZWQgZm9yIHRoZSBjdXJyZW50IGN5Y2xlPwAAAAAAFGNoZWNrX2N5Y2xlX2NvbXBsZXRlAAAAAQAAAAAAAAAJY2lyY2xlX2lkAAAAAAAABgAAAAEAAAPpAAAAAQAAAAM=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACQAAAAAAAAAAAAAABk5leHRJZAAAAAAAAQAAAAAAAAAGQ2lyY2xlAAAAAAABAAAABgAAAAEAAAAAAAAAC1BheW91dE9yZGVyAAAAAAEAAAAGAAAAAQAAAAAAAAAMQ29udHJpYnV0aW9uAAAAAwAAAAYAAAAEAAAAEwAAAAEAAAAAAAAAB0RlcG9zaXQAAAAAAgAAAAYAAAATAAAAAQAAAAAAAAAORGVwb3NpdENsYWltZWQAAAAAAAIAAAAGAAAAEwAAAAEAAAAAAAAAB0FycmVhcnMAAAAAAgAAAAYAAAATAAAAAQAAAAAAAAAHU3RyaWtlcwAAAAACAAAABgAAABMAAAABAAAAAAAAAA1NZW1iZXJDaXJjbGVzAAAAAAAAAQAAABM=",
        "AAAAAQAAANxTY2FsYXIsIGhvdC1wYXRoIHN0YXRlIGZvciBhIGNpcmNsZS4gUmV3cml0dGVuIG9uIGV2ZXJ5IGBjb250cmlidXRlKClgCmFuZCBgdHJpZ2dlcl9wYXlvdXQoKWAgY2FsbCwgYnV0IGRlbGliZXJhdGVseSBzbWFsbCDigJQgdGhlIG1lbWJlciBsaXN0CmxpdmVzIGluIGl0cyBvd24gYFBheW91dE9yZGVyYCBlbnRyeSBzbyBpdCdzIG5ldmVyIHRvdWNoZWQgYnkgYQpjb250cmlidXRpb24uAAAAAAAAAApDaXJjbGVDb3JlAAAAAAAMAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAEWNvbnRyaWJ1dGVkX2NvdW50AAAAAAAABAAAAAAAAAATY29udHJpYnV0aW9uX2Ftb3VudAAAAAALAAAAAAAAAA1jdXJyZW50X2N5Y2xlAAAAAAAABAAAAAAAAAAOY3ljbGVfZGVhZGxpbmUAAAAAAAYAAAAAAAAADmN5Y2xlX2ludGVydmFsAAAAAAAGAAAAAAAAAA5kZXBvc2l0X2Ftb3VudAAAAAAACwAAAAAAAAACaWQAAAAAAAYAAABGQ29uZmlndXJlZCBjYXAgb24gbWVtYmVyc2hpcCwgZW5mb3JjZWQgb25seSB3aGlsZSBgc3RhdHVzID09IENyZWF0ZWRgLgAAAAAAC21heF9tZW1iZXJzAAAAAAQAAACwRmluYWwgbWVtYmVyIGNvdW50LCBmcm96ZW4gYXQgYHN0YXJ0X2NpcmNsZWAuIERyaXZlcyBhbGwgcm90YXRpb24KbWF0aCBvbmNlIGBBY3RpdmVgIOKAlCBpbmRlcGVuZGVudCBvZiBgbWF4X21lbWJlcnNgLCBzaW5jZSBhIGNpcmNsZQptYXkgc3RhcnQgd2l0aCBmZXdlciBtZW1iZXJzIHRoYW4gaXRzIGNhcC4AAAAMbWVtYmVyX2NvdW50AAAABAAAAAAAAAAGc3RhdHVzAAAAAAfQAAAADENpcmNsZVN0YXR1cwAAAAAAAAAFdG9rZW4AAAAAAAAT",
        "AAAAAQAAAH9SZWFkLW9ubHkgdmlldyByZXR1cm5lZCB0byBjYWxsZXJzIChmcm9udGVuZCkgY29tYmluaW5nIHRoZSBzY2FsYXIgY29yZQp3aXRoIHRoZSBjdXJyZW50IHBheW91dCBvcmRlciwgZm9yIGEgc2luZ2xlIHJvdW5kLXRyaXAuAAAAAAAAAAAKQ2lyY2xlVmlldwAAAAAAAgAAAAAAAAAEY29yZQAAB9AAAAAKQ2lyY2xlQ29yZQAAAAAAAAAAAAxwYXlvdXRfb3JkZXIAAAPqAAAAEw==",
        "AAAAAgAAAAAAAAAAAAAADENpcmNsZVN0YXR1cwAAAAMAAAAAAAAAQ09wZW4gZm9yIG1lbWJlcnNoaXAuIEFkbWluIGNhbiBzdGFydCBvbmNlID49IDIgbWVtYmVycyBoYXZlIGpvaW5lZC4AAAAAB0NyZWF0ZWQAAAAAAAAAAIRSb3RhdGlvbiBpcyBydW5uaW5nLiBNZW1iZXJzaGlwIGFuZCBwYXlvdXQgb3JkZXIgYXJlIGZyb3plbiAoYXNpZGUKZnJvbSBpbi1wbGFjZSBkZW1vdGlvbiBvZiBkZWZhdWx0ZXJzIHdpdGhpbiB0aGUgcmVtYWluaW5nIHNsaWNlKS4AAAAGQWN0aXZlAAAAAAAAAAAARUV2ZXJ5IG1lbWJlciBoYXMgcmVjZWl2ZWQgZXhhY3RseSBvbmUgcGF5b3V0LiBEZXBvc2l0cyBhcmUgY2xhaW1hYmxlLgAAAAAAAAlDb21wbGV0ZWQAAAA=",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADgAAADBDYWxsZXIgZG9lcyBub3QgbWF0Y2ggdGhlIGNpcmNsZSdzIHN0b3JlZCBhZG1pbi4AAAAITm90QWRtaW4AAAABAAAAK0FkZHJlc3MgaXMgYWxyZWFkeSBhIG1lbWJlciBvZiB0aGlzIGNpcmNsZS4AAAAADUFscmVhZHlNZW1iZXIAAAAAAAACAAAAKUNpcmNsZSBhbHJlYWR5IGhhcyBgbWF4X21lbWJlcnNgIG1lbWJlcnMuAAAAAAAACkNpcmNsZUZ1bGwAAAAAAAMAAABAYG1heF9tZW1iZXJzYCBpcyBvdXRzaWRlIHRoZSBhbGxvd2VkIFsyLCBNQVhfTUVNQkVSU19DQVBdIHJhbmdlLgAAABFJbnZhbGlkTWF4TWVtYmVycwAAAAAAAAQAAAAjTm8gY2lyY2xlIGV4aXN0cyB3aXRoIHRoZSBnaXZlbiBpZC4AAAAADkNpcmNsZU5vdEZvdW5kAAAAAAAFAAAAM0FjdGlvbiBpc24ndCB2YWxpZCBmb3IgdGhlIGNpcmNsZSdzIGN1cnJlbnQgc3RhdHVzLgAAAAANSW52YWxpZFN0YXR1cwAAAAAAAAYAAABBTWVtYmVyIGFscmVhZHkgaGFzIGEgcmVjb3JkZWQgY29udHJpYnV0aW9uIGZvciB0aGUgY3VycmVudCBjeWNsZS4AAAAAAAASQWxyZWFkeUNvbnRyaWJ1dGVkAAAAAAAHAAAAJ0FkZHJlc3MgaXMgbm90IGEgbWVtYmVyIG9mIHRoaXMgY2lyY2xlLgAAAAAJTm90TWVtYmVyAAAAAAAACAAAADtBIGNpcmNsZSBuZWVkcyBhdCBsZWFzdCAyIG1lbWJlcnMgYmVmb3JlIGl0IGNhbiBiZSBzdGFydGVkLgAAAAAQTm90RW5vdWdoTWVtYmVycwAAAAkAAABQYHRyaWdnZXJfcGF5b3V0YCBjYWxsZWQgYmVmb3JlIHRoZSBjeWNsZSBpcyBjb21wbGV0ZSBvciB0aGUgZGVhZGxpbmUKaGFzIHBhc3NlZC4AAAAWQ3ljbGVOb3RSZWFkeUZvclBheW91dAAAAAAACgAAADdgY2xhaW1fZGVwb3NpdGAgY2FsbGVkIGJlZm9yZSB0aGUgY2lyY2xlIGhhcyBjb21wbGV0ZWQuAAAAABJDaXJjbGVOb3RDb21wbGV0ZWQAAAAAAAsAAAA4RGVwb3NpdCBmb3IgdGhpcyBtZW1iZXIvY2lyY2xlIGhhcyBhbHJlYWR5IGJlZW4gY2xhaW1lZC4AAAAOQWxyZWFkeUNsYWltZWQAAAAAAAwAAAA7YGNvbnRyaWJ1dGlvbl9hbW91bnRgIG9yIGBkZXBvc2l0X2Ftb3VudGAgbXVzdCBiZSBwb3NpdGl2ZS4AAAAADUludmFsaWRBbW91bnQAAAAAAAANAAAAImBjeWNsZV9pbnRlcnZhbGAgbXVzdCBiZSBwb3NpdGl2ZS4AAAAAAA9JbnZhbGlkSW50ZXJ2YWwAAAAADg==",
        "AAAABQAAAAAAAAAAAAAAC0RlcG9zaXRQYWlkAAAAAAEAAAAMZGVwb3NpdF9wYWlkAAAAAwAAAAAAAAAJY2lyY2xlX2lkAAAAAAAABgAAAAEAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAADEN5Y2xlU2tpcHBlZAAAAAEAAAANY3ljbGVfc2tpcHBlZAAAAAAAAAIAAAAAAAAACWNpcmNsZV9pZAAAAAAAAAYAAAABAAAAAAAAAAVjeWNsZQAAAAAAAAQAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADE1lbWJlckpvaW5lZAAAAAEAAAANbWVtYmVyX2pvaW5lZAAAAAAAAAMAAAAAAAAACWNpcmNsZV9pZAAAAAAAAAYAAAABAAAAAAAAAAZtZW1iZXIAAAAAABMAAAABAAAAAAAAAAhwb3NpdGlvbgAAAAQAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADUNpcmNsZUNyZWF0ZWQAAAAAAAABAAAADmNpcmNsZV9jcmVhdGVkAAAAAAAHAAAAAAAAAAljaXJjbGVfaWQAAAAAAAAGAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAAAAAATY29udHJpYnV0aW9uX2Ftb3VudAAAAAALAAAAAAAAAAAAAAAOZGVwb3NpdF9hbW91bnQAAAAAAAsAAAAAAAAAAAAAAA5jeWNsZV9pbnRlcnZhbAAAAAAABgAAAAAAAAAAAAAAC21heF9tZW1iZXJzAAAAAAQAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADUNpcmNsZVN0YXJ0ZWQAAAAAAAABAAAADmNpcmNsZV9zdGFydGVkAAAAAAADAAAAAAAAAAljaXJjbGVfaWQAAAAAAAAGAAAAAQAAAAAAAAAMbWVtYmVyX2NvdW50AAAABAAAAAAAAAAAAAAADmN5Y2xlX2RlYWRsaW5lAAAAAAAGAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADkRlcG9zaXRDbGFpbWVkAAAAAAABAAAAD2RlcG9zaXRfY2xhaW1lZAAAAAADAAAAAAAAAAljaXJjbGVfaWQAAAAAAAAGAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAD0NpcmNsZUNvbXBsZXRlZAAAAAABAAAAEGNpcmNsZV9jb21wbGV0ZWQAAAABAAAAAAAAAAljaXJjbGVfaWQAAAAAAAAGAAAAAQAAAAI=",
        "AAAABQAAAAAAAAAAAAAAD01lbWJlckRlZmF1bHRlZAAAAAABAAAAEG1lbWJlcl9kZWZhdWx0ZWQAAAAEAAAAAAAAAAljaXJjbGVfaWQAAAAAAAAGAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAAAAAAFY3ljbGUAAAAAAAAEAAAAAAAAAAAAAAAHc3RyaWtlcwAAAAAEAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAD1BheW91dFRyaWdnZXJlZAAAAAABAAAAEHBheW91dF90cmlnZ2VyZWQAAAAFAAAAAAAAAAljaXJjbGVfaWQAAAAAAAAGAAAAAQAAAAAAAAAJcmVjaXBpZW50AAAAAAAAEwAAAAEAAAAAAAAABWN5Y2xlAAAAAAAABAAAAAAAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAAAAAADGZ1bGx5X2Z1bmRlZAAAAAEAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAEENvbnRyaWJ1dGlvbk1hZGUAAAABAAAAEWNvbnRyaWJ1dGlvbl9tYWRlAAAAAAAABAAAAAAAAAAJY2lyY2xlX2lkAAAAAAAABgAAAAEAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAAAAAAABWN5Y2xlAAAAAAAABAAAAAAAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAC" ]),
      options
    )
  }
  public readonly fromJSON = {
    contribute: this.txFromJSON<Result<void>>,
        get_status: this.txFromJSON<Result<CircleView>>,
        join_circle: this.txFromJSON<Result<void>>,
        start_circle: this.txFromJSON<Result<void>>,
        claim_deposit: this.txFromJSON<Result<i128>>,
        create_circle: this.txFromJSON<Result<u64>>,
        get_my_circles: this.txFromJSON<Array<u64>>,
        trigger_payout: this.txFromJSON<Result<void>>,
        check_cycle_complete: this.txFromJSON<Result<boolean>>
  }
}