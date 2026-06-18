"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Forces fetching fresh data: ranks (saving a new LP snapshot),
// match history, estimated MMR, match details.
export function RefreshButton() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      // Refresh what changes after a game (rank/LP, new matches).
      // We deliberately skip MMR — it's expensive and changes slowly, computed
      // once on page load. invalidateQueries reloads active matching queries on
      // its own, so we don't call a separate refetchQueries (which would also
      // pull MMR and slow down the refresh).
      await queryClient.invalidateQueries({
        predicate: (q) =>
          ["players", "matches"].includes(q.queryKey[0] as string),
      });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      className="ml-auto flex items-center gap-1.5 rounded-lg bg-gold-400/15 px-3 py-1.5 text-sm font-medium text-gold-400 ring-1 ring-gold-400/40 transition hover:bg-gold-400/25 disabled:opacity-50"
    >
      <span className={refreshing ? "animate-spin" : ""}>⟳</span>
      {refreshing ? "Refreshing…" : "Refresh"}
    </button>
  );
}
