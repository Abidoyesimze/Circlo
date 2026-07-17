import * as React from "react";

import { fetchCircleActivity, type CircleActivityEvent } from "@/lib/events";

export function useCircleActivity(circleId: bigint | null) {
  const [events, setEvents] = React.useState<CircleActivityEvent[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (circleId === null) return;
    try {
      const result = await fetchCircleActivity(circleId);
      setEvents(result);
    } catch (err) {
      // Leave prior events in place; the activity feed is a nice-to-have,
      // not something that should block the rest of the page on failure.
      // Still log it — a silent catch here previously hid a real RPC bug.
      console.error("Failed to load circle activity:", err);
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  React.useEffect(() => {
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, 20_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { events, loading, refresh };
}
