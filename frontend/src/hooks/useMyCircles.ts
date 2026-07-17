import * as React from "react";
import type { CircleView } from "circlo-client";

import { getContractClient } from "@/lib/contract";
import { readContract, readContractPlain } from "@/lib/tx";

interface MyCircle {
  id: bigint;
  view: CircleView;
}

export function useMyCircles(address: string | null) {
  const [circles, setCircles] = React.useState<MyCircle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!address) {
      setCircles([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const client = getContractClient();
      const ids = await readContractPlain(client.get_my_circles({ member: address }));
      const views = await Promise.all(
        ids.map(async (id) => {
          try {
            const view = await readContract(client.get_status({ circle_id: id }));
            return { id, view };
          } catch {
            return null;
          }
        }),
      );
      setCircles(views.filter((c): c is MyCircle => c !== null).reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your circles.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  React.useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return { circles, loading, error, refresh };
}
