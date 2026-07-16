use soroban_sdk::{contracttype, Address, Vec};

/// Hard cap on members per circle. Bounds the worst-case membership scan in
/// `contribute` and the worst-case demotion work in `trigger_payout`'s
/// deadline-fallback path so both always fit comfortably inside a single
/// transaction's CPU/instruction budget, regardless of how many circles or
/// how large any one circle grows.
pub const MAX_MEMBERS_CAP: u32 = 20;

/// Ledger extension window (in ledgers, ~5s each) applied to persistent
/// entries every time they're touched. ~30 days.
pub const LEDGER_BUMP: u32 = 518_400;
pub const LEDGER_THRESHOLD: u32 = 500_000;

/// Instance storage TTL window.
pub const INSTANCE_BUMP: u32 = 518_400;
pub const INSTANCE_THRESHOLD: u32 = 500_000;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CircleStatus {
    /// Open for membership. Admin can start once >= 2 members have joined.
    Created,
    /// Rotation is running. Membership and payout order are frozen (aside
    /// from in-place demotion of defaulters within the remaining slice).
    Active,
    /// Every member has received exactly one payout. Deposits are claimable.
    Completed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    NextId,
    Circle(u64),
    PayoutOrder(u64),
    Contribution(u64, u32, Address),
    Deposit(u64, Address),
    DepositClaimed(u64, Address),
    Arrears(u64, Address),
    Strikes(u64, Address),
    MemberCircles(Address),
}

/// Scalar, hot-path state for a circle. Rewritten on every `contribute()`
/// and `trigger_payout()` call, but deliberately small — the member list
/// lives in its own `PayoutOrder` entry so it's never touched by a
/// contribution.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CircleCore {
    pub id: u64,
    pub admin: Address,
    pub token: Address,
    pub contribution_amount: i128,
    pub deposit_amount: i128,
    pub cycle_interval: u64,
    /// Configured cap on membership, enforced only while `status == Created`.
    pub max_members: u32,
    /// Final member count, frozen at `start_circle`. Drives all rotation
    /// math once `Active` — independent of `max_members`, since a circle
    /// may start with fewer members than its cap.
    pub member_count: u32,
    pub current_cycle: u32,
    pub cycle_deadline: u64,
    pub contributed_count: u32,
    pub status: CircleStatus,
}

/// Read-only view returned to callers (frontend) combining the scalar core
/// with the current payout order, for a single round-trip.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CircleView {
    pub core: CircleCore,
    pub payout_order: Vec<Address>,
}
