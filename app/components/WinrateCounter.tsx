"use client";

import { useQuery } from "@tanstack/react-query";
import type { MatchHistoryResponse, PlayerRankData } from "@/lib/types";

async function fetchMatches(
  puuid: string,
  championId: number,
): Promise<MatchHistoryResponse> {
  const res = await fetch(
    `/api/player/${puuid}/matches?champion=${championId}&count=20`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  return res.json();
}

// Big shared winrate counter — both players queue together, so games/wins
// are the same. We read the match history of the first available player.
export function WinrateCounter({ player }: { player: PlayerRankData }) {
  const { data } = useQuery({
    queryKey: ["matches", player.puuid, player.championId],
    queryFn: () => fetchMatches(player.puuid, player.championId),
    enabled: Boolean(player.puuid),
  });

  const matches = data?.matches ?? [];
  const games = matches.length;
  const wins = matches.filter((m) => m.win).length;
  const losses = games - wins;
  const winrate = games > 0 ? Math.round((wins / games) * 100) : 0;

  const color =
    winrate >= 60
      ? "text-emerald-400"
      : winrate >= 50
        ? "text-gold-400"
        : "text-red-400";

  return (
    <div className="mb-6 flex flex-col items-center rounded-2xl border border-navy-700 bg-navy-900 px-6 py-8">
      <div className="text-xs uppercase tracking-widest text-gold-300/50">
        Shared winrate
      </div>
      <div className={"text-7xl font-black tabular-nums " + color}>
        {winrate}
        <span className="text-4xl">%</span>
      </div>
      <div className="mt-1 text-sm text-gold-300/60">
        <span className="font-semibold text-emerald-400">{wins}W</span>
        {" / "}
        <span className="font-semibold text-red-400">{losses}L</span>
        {" · "}
        {games} games
      </div>
    </div>
  );
}
