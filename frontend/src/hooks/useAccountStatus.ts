import * as React from "react";

import { fetchAccountStatus, type AccountStatus } from "@/lib/account";

export function useAccountStatus(address: string | null) {
  const [status, setStatus] = React.useState<AccountStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!address) {
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      const result = await fetchAccountStatus(address);
      setStatus(result);
    } catch (err) {
      console.error("Failed to check account status:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  React.useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
