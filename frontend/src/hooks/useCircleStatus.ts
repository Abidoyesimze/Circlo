import * as React from "react";
import type { CircleView } from "circlo-client";

import { getContractClient } from "@/lib/contract";
import { readContract } from "@/lib/tx";

interface UseCircleStatusResult {
  circle: CircleView | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCircleStatus(circleId: bigint | null): UseCircleStatusResult {
  const [circle, setCircle] = React.useState<CircleView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (circleId === null) return;
    try {
      setError(null);
      const client = getContractClient();
      const view = await readContract(client.get_status({ circle_id: circleId }));
      setCircle(view);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this circle.");
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  React.useEffect(() => {
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { circle, loading, error, refresh };
}
