use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Caller does not match the circle's stored admin.
    NotAdmin = 1,
    /// Address is already a member of this circle.
    AlreadyMember = 2,
    /// Circle already has `max_members` members.
    CircleFull = 3,
    /// `max_members` is outside the allowed [2, MAX_MEMBERS_CAP] range.
    InvalidMaxMembers = 4,
    /// No circle exists with the given id.
    CircleNotFound = 5,
    /// Action isn't valid for the circle's current status.
    InvalidStatus = 6,
    /// Member already has a recorded contribution for the current cycle.
    AlreadyContributed = 7,
    /// Address is not a member of this circle.
    NotMember = 8,
    /// A circle needs at least 2 members before it can be started.
    NotEnoughMembers = 9,
    /// `trigger_payout` called before the cycle is complete or the deadline
    /// has passed.
    CycleNotReadyForPayout = 10,
    /// `claim_deposit` called before the circle has completed.
    CircleNotCompleted = 11,
    /// Deposit for this member/circle has already been claimed.
    AlreadyClaimed = 12,
    /// `contribution_amount` or `deposit_amount` must be positive.
    InvalidAmount = 13,
    /// `cycle_interval` must be positive.
    InvalidInterval = 14,
}
