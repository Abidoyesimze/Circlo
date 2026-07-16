#![no_std]

mod errors;
mod events;
mod storage;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, token, Address, Env, Vec};

pub use errors::Error;
pub use types::{CircleCore, CircleStatus, CircleView, MAX_MEMBERS_CAP};

use events::{
    CircleCompleted, CircleCreated, CircleStarted, ContributionMade, CycleSkipped, DepositClaimed,
    DepositPaid, MemberDefaulted, MemberJoined, PayoutTriggered,
};

#[contract]
pub struct CircloContract;

#[contractimpl]
impl CircloContract {
    /// Creates a new circle. The admin is automatically added as its first
    /// member (and, like everyone else, must pay the deposit if one is
    /// configured). Returns the new circle's id.
    pub fn create_circle(
        env: Env,
        admin: Address,
        token: Address,
        contribution_amount: i128,
        deposit_amount: i128,
        cycle_interval: u64,
        max_members: u32,
    ) -> Result<u64, Error> {
        storage::extend_instance(&env);
        admin.require_auth();

        if contribution_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if deposit_amount < 0 {
            return Err(Error::InvalidAmount);
        }
        if cycle_interval == 0 {
            return Err(Error::InvalidInterval);
        }
        if !(2..=MAX_MEMBERS_CAP).contains(&max_members) {
            return Err(Error::InvalidMaxMembers);
        }

        let id = storage::next_circle_id(&env);

        if deposit_amount > 0 {
            let token_client = token::TokenClient::new(&env, &token);
            token_client.transfer(&admin, env.current_contract_address(), &deposit_amount);
            storage::set_deposit(&env, id, &admin, deposit_amount);
            DepositPaid {
                circle_id: id,
                member: admin.clone(),
                amount: deposit_amount,
            }
            .publish(&env);
        }

        let core = CircleCore {
            id,
            admin: admin.clone(),
            token: token.clone(),
            contribution_amount,
            deposit_amount,
            cycle_interval,
            max_members,
            member_count: 0,
            current_cycle: 0,
            cycle_deadline: 0,
            contributed_count: 0,
            status: CircleStatus::Created,
        };
        storage::set_circle(&env, &core);

        let mut order = Vec::new(&env);
        order.push_back(admin.clone());
        storage::set_payout_order(&env, id, &order);
        storage::push_member_circle(&env, &admin, id);

        CircleCreated {
            circle_id: id,
            admin,
            token,
            contribution_amount,
            deposit_amount,
            cycle_interval,
            max_members,
        }
        .publish(&env);

        Ok(id)
    }

    /// Joins an existing circle. Only possible while the circle is still
    /// `Created`. Pays the circle's deposit, if any.
    pub fn join_circle(env: Env, circle_id: u64, member: Address) -> Result<(), Error> {
        storage::extend_instance(&env);
        member.require_auth();

        let core = storage::get_circle(&env, circle_id)?;
        if core.status != CircleStatus::Created {
            return Err(Error::InvalidStatus);
        }

        let mut order = storage::get_payout_order(&env, circle_id)?;
        if order.contains(&member) {
            return Err(Error::AlreadyMember);
        }
        if order.len() >= core.max_members {
            return Err(Error::CircleFull);
        }

        if core.deposit_amount > 0 {
            let token_client = token::TokenClient::new(&env, &core.token);
            token_client.transfer(
                &member,
                env.current_contract_address(),
                &core.deposit_amount,
            );
            storage::set_deposit(&env, circle_id, &member, core.deposit_amount);
            DepositPaid {
                circle_id,
                member: member.clone(),
                amount: core.deposit_amount,
            }
            .publish(&env);
        }

        order.push_back(member.clone());
        let position = order.len() - 1;
        storage::set_payout_order(&env, circle_id, &order);
        storage::push_member_circle(&env, &member, circle_id);

        MemberJoined {
            circle_id,
            member,
            position,
        }
        .publish(&env);

        Ok(())
    }

    /// Starts the rotation. Admin-only. Freezes membership and payout order
    /// (aside from in-place demotion of defaulters once the circle is
    /// running).
    pub fn start_circle(env: Env, circle_id: u64, admin: Address) -> Result<(), Error> {
        storage::extend_instance(&env);
        admin.require_auth();

        let mut core = storage::get_circle(&env, circle_id)?;
        if core.admin != admin {
            return Err(Error::NotAdmin);
        }
        if core.status != CircleStatus::Created {
            return Err(Error::InvalidStatus);
        }

        let order = storage::get_payout_order(&env, circle_id)?;
        if order.len() < 2 {
            return Err(Error::NotEnoughMembers);
        }

        let now = env.ledger().timestamp();
        core.member_count = order.len();
        core.current_cycle = 1;
        core.cycle_deadline = now + core.cycle_interval;
        core.status = CircleStatus::Active;
        storage::set_circle(&env, &core);

        CircleStarted {
            circle_id,
            member_count: core.member_count,
            cycle_deadline: core.cycle_deadline,
        }
        .publish(&env);

        Ok(())
    }

    /// Records a member's contribution for the current cycle.
    pub fn contribute(env: Env, circle_id: u64, member: Address) -> Result<(), Error> {
        storage::extend_instance(&env);
        member.require_auth();

        let mut core = storage::get_circle(&env, circle_id)?;
        if core.status != CircleStatus::Active {
            return Err(Error::InvalidStatus);
        }

        let order = storage::get_payout_order(&env, circle_id)?;
        if !order.contains(&member) {
            return Err(Error::NotMember);
        }
        if storage::get_contribution(&env, circle_id, core.current_cycle, &member).is_some() {
            return Err(Error::AlreadyContributed);
        }

        let token_client = token::TokenClient::new(&env, &core.token);
        token_client.transfer(
            &member,
            env.current_contract_address(),
            &core.contribution_amount,
        );

        storage::set_contribution(
            &env,
            circle_id,
            core.current_cycle,
            &member,
            core.contribution_amount,
        );
        core.contributed_count += 1;
        storage::set_circle(&env, &core);

        ContributionMade {
            circle_id,
            member,
            cycle: core.current_cycle,
            amount: core.contribution_amount,
        }
        .publish(&env);

        Ok(())
    }

    /// Pure view: has every member contributed for the current cycle?
    pub fn check_cycle_complete(env: Env, circle_id: u64) -> Result<bool, Error> {
        let core = storage::get_circle(&env, circle_id)?;
        Ok(core.status == CircleStatus::Active && core.contributed_count == core.member_count)
    }

    /// Permissionless: settles the current cycle once it's complete, or once
    /// its deadline has passed (whichever comes first). Pays the scheduled
    /// recipient whatever was actually collected (the full pool on the
    /// happy path, a partial pool if some members missed the deadline).
    /// Members who missed the deadline are charged arrears against their
    /// deposit, struck, and demoted to the back of the remaining rotation.
    /// Never reverts into a stuck state: an empty cycle just advances with a
    /// `CycleSkipped` event instead of a zero-amount transfer.
    pub fn trigger_payout(env: Env, circle_id: u64) -> Result<(), Error> {
        storage::extend_instance(&env);

        let mut core = storage::get_circle(&env, circle_id)?;
        if core.status != CircleStatus::Active {
            return Err(Error::InvalidStatus);
        }

        let now = env.ledger().timestamp();
        let complete = core.contributed_count == core.member_count;
        if !complete && now < core.cycle_deadline {
            return Err(Error::CycleNotReadyForPayout);
        }

        let mut order = storage::get_payout_order(&env, circle_id)?;
        let cycle = core.current_cycle;
        let recipient_index = cycle - 1;
        let recipient = order.get(recipient_index).ok_or(Error::CircleNotFound)?;

        // Tally collections and defaulters across the whole membership (not
        // just the remaining rotation slice) — everyone owes a contribution
        // every cycle, regardless of whether they've already received their
        // own payout in an earlier round.
        let mut collected: i128 = 0;
        let mut defaulted_indices: Vec<u32> = Vec::new(&env);
        for i in 0..core.member_count {
            let m = order.get(i).unwrap();
            match storage::get_contribution(&env, circle_id, cycle, &m) {
                Some(amount) => collected += amount,
                None => {
                    storage::add_arrears(&env, circle_id, &m, core.contribution_amount);
                    let strikes = storage::add_strike(&env, circle_id, &m);
                    MemberDefaulted {
                        circle_id,
                        member: m,
                        cycle,
                        strikes,
                    }
                    .publish(&env);
                    // Only demote members whose payout is still ahead of
                    // them — the current recipient's slot is retired this
                    // round regardless of whether they personally defaulted.
                    if i > recipient_index {
                        defaulted_indices.push_back(i);
                    }
                }
            }
        }

        // Stable-partition the remaining tail (everything after this
        // cycle's recipient slot) so contributors keep their relative
        // order and defaulters are pushed to the very back.
        if !defaulted_indices.is_empty() && recipient_index + 1 < core.member_count {
            let mut kept: Vec<Address> = Vec::new(&env);
            let mut demoted: Vec<Address> = Vec::new(&env);
            for i in (recipient_index + 1)..core.member_count {
                let m = order.get(i).unwrap();
                if defaulted_indices.contains(i) {
                    demoted.push_back(m);
                } else {
                    kept.push_back(m);
                }
            }
            let mut rebuilt: Vec<Address> = Vec::new(&env);
            for i in 0..=recipient_index {
                rebuilt.push_back(order.get(i).unwrap());
            }
            for m in kept.iter() {
                rebuilt.push_back(m);
            }
            for m in demoted.iter() {
                rebuilt.push_back(m);
            }
            order = rebuilt;
            storage::set_payout_order(&env, circle_id, &order);
        }

        let fully_funded = collected == core.contribution_amount * (core.member_count as i128);

        // Effects before interaction: advance state before the outbound
        // transfer.
        core.current_cycle += 1;
        core.contributed_count = 0;
        core.cycle_deadline = now + core.cycle_interval;
        let completing = core.current_cycle > core.member_count;
        core.status = if completing {
            CircleStatus::Completed
        } else {
            CircleStatus::Active
        };
        storage::set_circle(&env, &core);

        if collected > 0 {
            let token_client = token::TokenClient::new(&env, &core.token);
            token_client.transfer(&env.current_contract_address(), &recipient, &collected);
            PayoutTriggered {
                circle_id,
                recipient,
                cycle,
                amount: collected,
                fully_funded,
            }
            .publish(&env);
        } else {
            CycleSkipped { circle_id, cycle }.publish(&env);
        }

        if completing {
            CircleCompleted { circle_id }.publish(&env);
        }

        Ok(())
    }

    /// Refunds a member's deposit (less any arrears charged against them)
    /// once the circle has completed. Pull-based: each member claims their
    /// own refund rather than the contract pushing refunds to everyone in
    /// one transaction, which wouldn't scale.
    pub fn claim_deposit(env: Env, circle_id: u64, member: Address) -> Result<i128, Error> {
        storage::extend_instance(&env);
        member.require_auth();

        let core = storage::get_circle(&env, circle_id)?;
        if core.status != CircleStatus::Completed {
            return Err(Error::CircleNotCompleted);
        }
        if storage::is_deposit_claimed(&env, circle_id, &member) {
            return Err(Error::AlreadyClaimed);
        }

        let deposit = storage::get_deposit(&env, circle_id, &member);
        let arrears = storage::get_arrears(&env, circle_id, &member);
        let refund = if deposit > arrears {
            deposit - arrears
        } else {
            0
        };

        storage::set_deposit_claimed(&env, circle_id, &member);

        if refund > 0 {
            let token_client = token::TokenClient::new(&env, &core.token);
            token_client.transfer(&env.current_contract_address(), &member, &refund);
        }

        DepositClaimed {
            circle_id,
            member,
            amount: refund,
        }
        .publish(&env);

        Ok(refund)
    }

    /// Read-only status snapshot for the frontend.
    pub fn get_status(env: Env, circle_id: u64) -> Result<CircleView, Error> {
        let core = storage::get_circle(&env, circle_id)?;
        let payout_order = storage::get_payout_order(&env, circle_id)?;
        Ok(CircleView { core, payout_order })
    }

    /// Circle ids a member has ever joined.
    pub fn get_my_circles(env: Env, member: Address) -> Vec<u64> {
        storage::get_member_circles(&env, &member)
    }
}
