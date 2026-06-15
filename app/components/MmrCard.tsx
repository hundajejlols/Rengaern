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
    throw new Error(body.error ?? `Błąd ${res.status}`);
  }
  return res.json();
}

export function MmrCard({ puuid }: { puuid: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mmr", puuid],
    queryFn: () => fetchMmr(puuid),
    enabled: Boolean(puuid),
  });

  return (
    <div className="mt-4 rounded-lg border border-gold-500/30 bg-navy-800/50 p-4">
      <div className="text-xs uppercase tracking-wide text-gold-300/50">
        Szacowane MMR
      </div>
      {isLoading && (
        <div className="mt-1 text-sm text-gold-300/60">Liczenie…</div>
      )}
      {isError && (
        <div className="mt-1 text-sm text-red-400">Nie udało się policzyć.</div>
      )}
      {data &&
        (data.estimatedRank ? (
          <>
            <div className="mt-1 text-xl font-bold text-gold-300">
              {data.estimatedRank}
            </div>
            <div className="mt-1 text-xs text-gold-300/40">
              Średnia rangi {data.sampleSize} graczy z {data.matchesUsed}{" "}
              ostatnich meczów (bez Rengara i Iverna).
            </div>
          </>
        ) : (
          <div className="mt-1 text-sm text-gold-300/50">
            Za mało danych — brak rang w ostatnich meczach.
          </div>
        ))}
    </div>
  );
}
