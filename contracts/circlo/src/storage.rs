use soroban_sdk::{Address, Env, Vec};

use crate::errors::Error;
use crate::types::{
    CircleCore, DataKey, INSTANCE_BUMP, INSTANCE_THRESHOLD, LEDGER_BUMP, LEDGER_THRESHOLD,
};

/// Extends the instance storage TTL. Call once at the top of every public
/// entrypoint.
pub fn extend_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP);
}

fn extend_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, LEDGER_THRESHOLD, LEDGER_BUMP);
}

pub fn next_circle_id(env: &Env) -> u64 {
    let id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap_or(0);
    env.storage().instance().set(&DataKey::NextId, &(id + 1));
    id
}

pub fn get_circle(env: &Env, id: u64) -> Result<CircleCore, Error> {
    let key = DataKey::Circle(id);
    let core = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::CircleNotFound)?;
    extend_persistent(env, &key);
    Ok(core)
}

pub fn set_circle(env: &Env, core: &CircleCore) {
    let key = DataKey::Circle(core.id);
    env.storage().persistent().set(&key, core);
    extend_persistent(env, &key);
}

pub fn get_payout_order(env: &Env, id: u64) -> Result<Vec<Address>, Error> {
    let key = DataKey::PayoutOrder(id);
    let order = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::CircleNotFound)?;
    extend_persistent(env, &key);
    Ok(order)
}

pub fn set_payout_order(env: &Env, id: u64, order: &Vec<Address>) {
    let key = DataKey::PayoutOrder(id);
    env.storage().persistent().set(&key, order);
    extend_persistent(env, &key);
}

pub fn get_contribution(env: &Env, id: u64, cycle: u32, member: &Address) -> Option<i128> {
    let key = DataKey::Contribution(id, cycle, member.clone());
    let val = env.storage().persistent().get(&key);
    if val.is_some() {
        extend_persistent(env, &key);
    }
    val
}

pub fn set_contribution(env: &Env, id: u64, cycle: u32, member: &Address, amount: i128) {
    let key = DataKey::Contribution(id, cycle, member.clone());
    env.storage().persistent().set(&key, &amount);
    extend_persistent(env, &key);
}

pub fn get_deposit(env: &Env, id: u64, member: &Address) -> i128 {
    let key = DataKey::Deposit(id, member.clone());
    let val = env.storage().persistent().get(&key).unwrap_or(0);
    if val != 0 {
        extend_persistent(env, &key);
    }
    val
}

pub fn set_deposit(env: &Env, id: u64, member: &Address, amount: i128) {
    let key = DataKey::Deposit(id, member.clone());
    env.storage().persistent().set(&key, &amount);
    extend_persistent(env, &key);
}

pub fn is_deposit_claimed(env: &Env, id: u64, member: &Address) -> bool {
    let key = DataKey::DepositClaimed(id, member.clone());
    env.storage().persistent().get(&key).unwrap_or(false)
}

pub fn set_deposit_claimed(env: &Env, id: u64, member: &Address) {
    let key = DataKey::DepositClaimed(id, member.clone());
    env.storage().persistent().set(&key, &true);
    extend_persistent(env, &key);
}

pub fn get_arrears(env: &Env, id: u64, member: &Address) -> i128 {
    let key = DataKey::Arrears(id, member.clone());
    let val = env.storage().persistent().get(&key).unwrap_or(0);
    if val != 0 {
        extend_persistent(env, &key);
    }
    val
}

pub fn add_arrears(env: &Env, id: u64, member: &Address, amount: i128) {
    let current = get_arrears(env, id, member);
    let key = DataKey::Arrears(id, member.clone());
    env.storage().persistent().set(&key, &(current + amount));
    extend_persistent(env, &key);
}

pub fn get_strikes(env: &Env, id: u64, member: &Address) -> u32 {
    let key = DataKey::Strikes(id, member.clone());
    let val = env.storage().persistent().get(&key).unwrap_or(0);
    if val != 0 {
        extend_persistent(env, &key);
    }
    val
}

pub fn add_strike(env: &Env, id: u64, member: &Address) -> u32 {
    let current = get_strikes(env, id, member);
    let key = DataKey::Strikes(id, member.clone());
    let next = current + 1;
    env.storage().persistent().set(&key, &next);
    extend_persistent(env, &key);
    next
}

pub fn get_member_circles(env: &Env, member: &Address) -> Vec<u64> {
    let key = DataKey::MemberCircles(member.clone());
    let val = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    if !val.is_empty() {
        extend_persistent(env, &key);
    }
    val
}

pub fn push_member_circle(env: &Env, member: &Address, id: u64) {
    let mut circles = get_member_circles(env, member);
    circles.push_back(id);
    let key = DataKey::MemberCircles(member.clone());
    env.storage().persistent().set(&key, &circles);
    extend_persistent(env, &key);
}
