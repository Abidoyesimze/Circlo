#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env,
};

use crate::{CircleStatus, CircloContract, CircloContractClient, Error};

const CONTRIBUTION: i128 = 100_0000000; // 100 units, 7dp like the real USDC SAC
const DEPOSIT: i128 = 50_0000000;
const CYCLE_SECONDS: u64 = 7 * 24 * 60 * 60; // weekly
const FUNDING: i128 = 1_000_000_000_000; // plenty of test-token balance to draw from

struct TestCtx<'a> {
    env: Env,
    client: CircloContractClient<'a>,
    token: token::TokenClient<'a>,
    token_admin: token::StellarAssetClient<'a>,
}

fn setup<'a>() -> TestCtx<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(CircloContract, ());
    let client = CircloContractClient::new(&env, &contract_id);

    let token_admin_addr = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin_addr.clone());
    let token = token::TokenClient::new(&env, &sac.address());
    let token_admin = token::StellarAssetClient::new(&env, &sac.address());

    TestCtx {
        env,
        client,
        token,
        token_admin,
    }
}

fn fund(ctx: &TestCtx, who: &Address, amount: i128) {
    ctx.token_admin.mint(who, &amount);
}

fn advance_ledger_time(env: &Env, seconds: u64) {
    env.ledger().with_mut(|li| {
        li.timestamp += seconds;
    });
}

#[test]
fn full_lifecycle_happy_path() {
    let ctx = setup();
    let admin = Address::generate(&ctx.env);
    let m2 = Address::generate(&ctx.env);
    let m3 = Address::generate(&ctx.env);

    for who in [&admin, &m2, &m3] {
        fund(&ctx, who, FUNDING);
    }

    let circle_id = ctx.client.create_circle(
        &admin,
        &ctx.token.address,
        &CONTRIBUTION,
        &DEPOSIT,
        &CYCLE_SECONDS,
        &3,
    );

    ctx.client.join_circle(&circle_id, &m2);
    ctx.client.join_circle(&circle_id, &m3);

    // Deposits collected from all three at this point.
    assert_eq!(ctx.token.balance(&admin), FUNDING - DEPOSIT);

    ctx.client.start_circle(&circle_id, &admin);

    let status = ctx.client.get_status(&circle_id);
    assert_eq!(status.core.status, CircleStatus::Active);
    assert_eq!(status.core.current_cycle, 1);
    assert_eq!(status.payout_order.get(0).unwrap(), admin.clone());

    // --- Cycle 1: everyone contributes, admin (index 0) is paid ---
    ctx.client.contribute(&circle_id, &admin);
    ctx.client.contribute(&circle_id, &m2);
    assert!(!ctx.client.check_cycle_complete(&circle_id));
    ctx.client.contribute(&circle_id, &m3);
    assert!(ctx.client.check_cycle_complete(&circle_id));

    let admin_balance_before = ctx.token.balance(&admin);
    ctx.client.trigger_payout(&circle_id);
    let pool = CONTRIBUTION * 3;
    assert_eq!(ctx.token.balance(&admin), admin_balance_before + pool);

    let status = ctx.client.get_status(&circle_id);
    assert_eq!(status.core.current_cycle, 2);
    assert_eq!(status.core.status, CircleStatus::Active);

    // --- Cycle 2: everyone contributes, m2 (index 1) is paid ---
    ctx.client.contribute(&circle_id, &admin);
    ctx.client.contribute(&circle_id, &m2);
    ctx.client.contribute(&circle_id, &m3);
    // m2 also just paid its own contribution above, so the net gain is the
    // pool minus what it put in.
    let m2_balance_before = ctx.token.balance(&m2);
    ctx.client.trigger_payout(&circle_id);
    assert_eq!(ctx.token.balance(&m2), m2_balance_before + pool);

    // --- Cycle 3: everyone contributes, m3 (index 2) is paid, circle completes ---
    ctx.client.contribute(&circle_id, &admin);
    ctx.client.contribute(&circle_id, &m2);
    ctx.client.contribute(&circle_id, &m3);
    let m3_balance_before = ctx.token.balance(&m3);
    ctx.client.trigger_payout(&circle_id);
    assert_eq!(ctx.token.balance(&m3), m3_balance_before + pool);

    let status = ctx.client.get_status(&circle_id);
    assert_eq!(status.core.status, CircleStatus::Completed);

    // --- Deposits are refundable now, no arrears were ever charged ---
    let admin_before = ctx.token.balance(&admin);
    let refund = ctx.client.claim_deposit(&circle_id, &admin);
    assert_eq!(refund, DEPOSIT);
    assert_eq!(ctx.token.balance(&admin), admin_before + DEPOSIT);

    // Double-claim is rejected.
    let err = ctx
        .client
        .try_claim_deposit(&circle_id, &admin)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::AlreadyClaimed);
}

#[test]
fn deadline_miss_pays_partial_pool_and_charges_arrears() {
    let ctx = setup();
    let admin = Address::generate(&ctx.env);
    let m2 = Address::generate(&ctx.env);
    let m3 = Address::generate(&ctx.env);

    for who in [&admin, &m2, &m3] {
        fund(&ctx, who, FUNDING);
    }

    let circle_id = ctx.client.create_circle(
        &admin,
        &ctx.token.address,
        &CONTRIBUTION,
        &DEPOSIT,
        &CYCLE_SECONDS,
        &3,
    );
    ctx.client.join_circle(&circle_id, &m2);
    ctx.client.join_circle(&circle_id, &m3);
    ctx.client.start_circle(&circle_id, &admin);

    // Only admin (this cycle's recipient) and m2 contribute; m3 misses.
    ctx.client.contribute(&circle_id, &admin);
    ctx.client.contribute(&circle_id, &m2);

    // Not ready yet — deadline hasn't passed and not everyone has paid in.
    let err = ctx
        .client
        .try_trigger_payout(&circle_id)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::CycleNotReadyForPayout);

    advance_ledger_time(&ctx.env, CYCLE_SECONDS + 1);

    let admin_before = ctx.token.balance(&admin);
    ctx.client.trigger_payout(&circle_id);
    // Partial pool: only the two contributions that came in.
    assert_eq!(ctx.token.balance(&admin), admin_before + CONTRIBUTION * 2);

    // m3 defaulted: struck, and charged arrears equal to one contribution.
    let status = ctx.client.get_status(&circle_id);
    assert_eq!(status.core.current_cycle, 2);

    // m3 was demoted behind m2 in the remaining rotation (was index 2 of
    // [admin, m2, m3]; admin's slot is retired, m2 and m3 remain — m3
    // defaulted so it's pushed behind m2).
    assert_eq!(status.payout_order.get(1).unwrap(), m2.clone());
    assert_eq!(status.payout_order.get(2).unwrap(), m3.clone());

    // Cycle 2: everyone pays in this time, m2 gets a full pool.
    ctx.client.contribute(&circle_id, &admin);
    ctx.client.contribute(&circle_id, &m2);
    ctx.client.contribute(&circle_id, &m3);
    let m2_before = ctx.token.balance(&m2);
    ctx.client.trigger_payout(&circle_id);
    assert_eq!(ctx.token.balance(&m2), m2_before + CONTRIBUTION * 3);

    // Cycle 3: m3 finally gets paid, circle completes.
    ctx.client.contribute(&circle_id, &admin);
    ctx.client.contribute(&circle_id, &m2);
    ctx.client.contribute(&circle_id, &m3);
    ctx.client.trigger_payout(&circle_id);

    // m3's one round of arrears (a full CONTRIBUTION) exceeds its DEPOSIT,
    // so the refund clamps to zero rather than going negative.
    let m3_before = ctx.token.balance(&m3);
    let refund = ctx.client.claim_deposit(&circle_id, &m3);
    assert_eq!(refund, 0);
    assert_eq!(ctx.token.balance(&m3), m3_before + refund);
}

#[test]
fn fully_empty_cycle_skips_without_transfer() {
    let ctx = setup();
    let admin = Address::generate(&ctx.env);
    let m2 = Address::generate(&ctx.env);

    fund(&ctx, &admin, FUNDING);
    fund(&ctx, &m2, FUNDING);

    let circle_id = ctx.client.create_circle(
        &admin,
        &ctx.token.address,
        &CONTRIBUTION,
        &0,
        &CYCLE_SECONDS,
        &2,
    );
    ctx.client.join_circle(&circle_id, &m2);
    ctx.client.start_circle(&circle_id, &admin);

    // Nobody contributes this cycle at all.
    advance_ledger_time(&ctx.env, CYCLE_SECONDS + 1);

    let admin_before = ctx.token.balance(&admin);
    ctx.client.trigger_payout(&circle_id);
    assert_eq!(ctx.token.balance(&admin), admin_before); // no transfer happened

    let status = ctx.client.get_status(&circle_id);
    assert_eq!(status.core.current_cycle, 2);
}

#[test]
fn cannot_join_after_start_or_twice() {
    let ctx = setup();
    let admin = Address::generate(&ctx.env);
    let m2 = Address::generate(&ctx.env);
    let m3 = Address::generate(&ctx.env);
    fund(&ctx, &admin, FUNDING);
    fund(&ctx, &m2, FUNDING);
    fund(&ctx, &m3, FUNDING);

    let circle_id = ctx.client.create_circle(
        &admin,
        &ctx.token.address,
        &CONTRIBUTION,
        &0,
        &CYCLE_SECONDS,
        &2,
    );

    let err = ctx
        .client
        .try_join_circle(&circle_id, &admin)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::AlreadyMember);

    ctx.client.join_circle(&circle_id, &m2);

    let err = ctx
        .client
        .try_join_circle(&circle_id, &m3)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::CircleFull);

    ctx.client.start_circle(&circle_id, &admin);

    let err = ctx
        .client
        .try_join_circle(&circle_id, &m3)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidStatus);
}

#[test]
fn cannot_double_contribute_or_contribute_as_non_member() {
    let ctx = setup();
    let admin = Address::generate(&ctx.env);
    let m2 = Address::generate(&ctx.env);
    let outsider = Address::generate(&ctx.env);
    fund(&ctx, &admin, FUNDING);
    fund(&ctx, &m2, FUNDING);

    let circle_id = ctx.client.create_circle(
        &admin,
        &ctx.token.address,
        &CONTRIBUTION,
        &0,
        &CYCLE_SECONDS,
        &2,
    );
    ctx.client.join_circle(&circle_id, &m2);
    ctx.client.start_circle(&circle_id, &admin);

    ctx.client.contribute(&circle_id, &admin);
    let err = ctx
        .client
        .try_contribute(&circle_id, &admin)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::AlreadyContributed);

    let err = ctx
        .client
        .try_contribute(&circle_id, &outsider)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::NotMember);
}

#[test]
fn start_circle_requires_admin_and_min_members() {
    let ctx = setup();
    let admin = Address::generate(&ctx.env);
    let not_admin = Address::generate(&ctx.env);
    fund(&ctx, &admin, FUNDING);

    let circle_id = ctx.client.create_circle(
        &admin,
        &ctx.token.address,
        &CONTRIBUTION,
        &0,
        &CYCLE_SECONDS,
        &5,
    );

    // Only one member (admin) so far.
    let err = ctx
        .client
        .try_start_circle(&circle_id, &admin)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::NotEnoughMembers);

    let m2 = Address::generate(&ctx.env);
    fund(&ctx, &m2, FUNDING);
    ctx.client.join_circle(&circle_id, &m2);

    let err = ctx
        .client
        .try_start_circle(&circle_id, &not_admin)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::NotAdmin);
}

#[test]
fn claim_deposit_before_completion_rejected() {
    let ctx = setup();
    let admin = Address::generate(&ctx.env);
    let m2 = Address::generate(&ctx.env);
    fund(&ctx, &admin, FUNDING);
    fund(&ctx, &m2, FUNDING);

    let circle_id = ctx.client.create_circle(
        &admin,
        &ctx.token.address,
        &CONTRIBUTION,
        &DEPOSIT,
        &CYCLE_SECONDS,
        &2,
    );
    ctx.client.join_circle(&circle_id, &m2);
    ctx.client.start_circle(&circle_id, &admin);

    let err = ctx
        .client
        .try_claim_deposit(&circle_id, &admin)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::CircleNotCompleted);
}

#[test]
fn invalid_create_circle_params_rejected() {
    let ctx = setup();
    let admin = Address::generate(&ctx.env);
    fund(&ctx, &admin, FUNDING);

    let err = ctx
        .client
        .try_create_circle(&admin, &ctx.token.address, &0, &0, &CYCLE_SECONDS, &3)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidAmount);

    let err = ctx
        .client
        .try_create_circle(&admin, &ctx.token.address, &CONTRIBUTION, &0, &0, &3)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidInterval);

    let err = ctx
        .client
        .try_create_circle(
            &admin,
            &ctx.token.address,
            &CONTRIBUTION,
            &0,
            &CYCLE_SECONDS,
            &1,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidMaxMembers);

    let err = ctx
        .client
        .try_create_circle(
            &admin,
            &ctx.token.address,
            &CONTRIBUTION,
            &0,
            &CYCLE_SECONDS,
            &21,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidMaxMembers);
}
