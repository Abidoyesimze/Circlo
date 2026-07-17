// Kept as plain strings (matching circlo-client's `networks.testnet`) rather
// than imported from circlo-client directly, so lightweight pages (like the
// landing page) don't pull the entire Stellar SDK into their bundle just for
// two constants — only the pages that actually touch the contract lazy-load
// circlo-client via their own imports.
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const CONTRACT_ID = "CC3JCXU6XMMBZDRSFLNE36DQUGIY3HQ3HAIXGFHJBF4TRQD6TFMXS53P";

export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/**
 * Circle's public testnet USDC on Stellar (SAC wrapping the classic asset
 * issued by GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5,
 * centre.io). Verified live against testnet Horizon. Get test funds at
 * https://faucet.circle.com (requires a USDC trustline on the classic
 * account first — see the README).
 */
export const TESTNET_USDC_ADDRESS =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

export const TOKEN_DECIMALS = 7;

export const EXPLORER_TX_URL = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;
export const EXPLORER_ADDRESS_URL = (address: string) =>
  `https://stellar.expert/explorer/testnet/account/${address}`;
export const EXPLORER_CONTRACT_URL = (contractId: string) =>
  `https://stellar.expert/explorer/testnet/contract/${contractId}`;

/** Replace with your own Google Form (or other feedback form) link. */
export const FEEDBACK_FORM_URL = "https://forms.gle/REPLACE_ME";
