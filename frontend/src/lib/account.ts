import { HORIZON_URL } from "@/config";

// Same testnet USDC issuer used throughout the app (see config.ts). Horizon
// exposes classic-asset trustlines/balances directly, which is a much
// lighter check than simulating a Soroban token-contract invocation just to
// read a balance.
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export interface AccountStatus {
  exists: boolean;
  xlmBalance: number;
  hasUsdcTrustline: boolean;
  usdcBalance: number;
}

interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

export async function fetchAccountStatus(address: string): Promise<AccountStatus> {
  const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
  if (res.status === 404) {
    return { exists: false, xlmBalance: 0, hasUsdcTrustline: false, usdcBalance: 0 };
  }
  if (!res.ok) {
    throw new Error(`Horizon returned ${res.status} looking up account`);
  }

  const data: { balances?: HorizonBalance[] } = await res.json();
  let xlmBalance = 0;
  let hasUsdcTrustline = false;
  let usdcBalance = 0;

  for (const b of data.balances ?? []) {
    if (b.asset_type === "native") {
      xlmBalance = parseFloat(b.balance);
    } else if (b.asset_code === "USDC" && b.asset_issuer === USDC_ISSUER) {
      hasUsdcTrustline = true;
      usdcBalance = parseFloat(b.balance);
    }
  }

  return { exists: true, xlmBalance, hasUsdcTrustline, usdcBalance };
}
