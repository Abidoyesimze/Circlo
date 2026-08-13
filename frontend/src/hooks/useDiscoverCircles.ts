import * as React from "react";

import { discoverCircles, type DiscoveredCircle } from "@/lib/discovery";

export function useDiscoverCircles() {
  const [circles, setCircles] = React.useState<DiscoveredCircle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      setError(null);
      const result = await discoverCircles();
      setCircles(result);
    } catch (err) {
      console.error("Failed to load discoverable circles:", err);
      setError(err instanceof Error ? err.message : "Couldn't load circles.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return { circles, loading, error, refresh };
}
