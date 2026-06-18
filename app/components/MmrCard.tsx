"use client";

import { useQuery } from "@tanstack/react-query";

interface MmrEstimate {
  estimatedRank: string | null;
  sampleSize: number;
  matchesUsed: number;
}

async function fetchMmr(puuid: string): Promise<MmrEstimate> {
  const res = await fetch(`/api/player/${puuid}/mmr`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  return res.json();
}

export function MmrCard({ puuid }: { puuid: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mmr", puuid],
    queryFn: () => fetchMmr(puuid),
    enabled: Boolean(puuid),
  });

  const sub =
    data?.estimatedRank && !isError
      ? `${data.sampleSize} players · ${data.matchesUsed} games`
      : isError
        ? "failed"
        : isLoading
          ? "…"
          : "no data";

  const value = isLoading
    ? "…"
    : isError
      ? "—"
      : (data?.estimatedRank ?? "—");

  return (
    <div
      className="text-right"
      title="Average rank of nearby players from recent matches (excluding Rengar and Ivern)."
    >
      <dt className="text-xs uppercase text-gold-300/50">Est. MMR</dt>
      <dd className="font-semibold text-gold-300">{value}</dd>
      <dd className="text-xs text-gold-300/40">{sub}</dd>
    </div>
  );
}
