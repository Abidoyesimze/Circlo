import * as React from "react";

import { fetchProtocolStats, type ProtocolStats } from "@/lib/stats";

export function useProtocolStats() {
  const [stats, setStats] = React.useState<ProtocolStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      setError(null);
      const result = await fetchProtocolStats();
      setStats(result);
    } catch (err) {
      console.error("Failed to load protocol stats:", err);
      setError(err instanceof Error ? err.message : "Couldn't load stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { stats, loading, error, refresh };
}
