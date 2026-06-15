"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Wymusza pobranie świeżych danych: rangi (zapis nowego snapshotu LP),
// historia meczów, szacowane MMR, szczegóły meczów.
export function RefreshButton() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        predicate: (q) =>
          ["players", "matches", "mmr", "match"].includes(
            q.queryKey[0] as string,
          ),
      });
      // Czekamy aż aktywne zapytania faktycznie się przeładują.
      await queryClient.refetchQueries({ type: "active" });
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
      {refreshing ? "Odświeżanie…" : "Odśwież"}
    </button>
  );
}
