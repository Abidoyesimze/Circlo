use soroban_sdk::{contractevent, Address};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CircleCreated {
    #[topic]
    pub circle_id: u64,
    pub admin: Address,
    pub token: Address,
    pub contribution_amount: i128,
    pub deposit_amount: i128,
    pub cycle_interval: u64,
    pub max_members: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberJoined {
    #[topic]
    pub circle_id: u64,
    #[topic]
    pub member: Address,
    pub position: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CircleStarted {
    #[topic]
    pub circle_id: u64,
    pub member_count: u32,
    pub cycle_deadline: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContributionMade {
    #[topic]
    pub circle_id: u64,
    #[topic]
    pub member: Address,
    pub cycle: u32,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayoutTriggered {
    #[topic]
    pub circle_id: u64,
    #[topic]
    pub recipient: Address,
    pub cycle: u32,
    pub amount: i128,
    pub fully_funded: bool,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CycleSkipped {
    #[topic]
    pub circle_id: u64,
    pub cycle: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberDefaulted {
    #[topic]
    pub circle_id: u64,
    #[topic]
    pub member: Address,
    pub cycle: u32,
    pub strikes: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositPaid {
    #[topic]
    pub circle_id: u64,
    #[topic]
    pub member: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositClaimed {
    #[topic]
    pub circle_id: u64,
    #[topic]
    pub member: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CircleCompleted {
    #[topic]
    pub circle_id: u64,
}
