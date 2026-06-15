"use client";

import { useQuery } from "@tanstack/react-query";
import type { MatchHistoryResponse, PlayerRankData } from "@/lib/types";
import { PlayerAverages } from "./PlayerAverages";
import { PlayerRecords } from "./PlayerRecords";
import { RankTimeline } from "./RankTimeline";
import { MmrCard } from "./MmrCard";

async function fetchMatches(
  puuid: string,
  championId: number,
): Promise<MatchHistoryResponse> {
  const res = await fetch(
    `/api/player/${puuid}/matches?champion=${championId}&count=20`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Błąd ${res.status}`);
  }
  return res.json();
}

// Pełny profil pojedynczego gracza (bez sekcji live i nawigacji) —
// używany na łączonym dashboardzie dla obu graczy naraz.
export function PlayerSection({ player }: { player: PlayerRankData }) {
  // Winrate / liczbę gier liczymy z meczów challenge'u, nie z sezonu konta.
  const { data: matchData } = useQuery({
    queryKey: ["matches", player.puuid, player.championId],
    queryFn: () => fetchMatches(player.puuid, player.championId),
    enabled: Boolean(player.puuid),
  });

  const challengeMatches = matchData?.matches ?? [];
  const games = challengeMatches.length;
  const wins = challengeMatches.filter((m) => m.win).length;
  const winrate = games > 0 ? Math.round((wins / games) * 100) : 0;

  return (
    <section>
      <div className="mb-6">
        <RankTimeline
          tier={player.soloQueue?.tier}
          rank={player.soloQueue?.rank}
          leaguePoints={player.soloQueue?.leaguePoints}
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-navy-700 bg-navy-900 p-5">
          <div className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={player.championIconUrl}
              alt={player.championName}
              className="h-16 w-16 rounded-lg ring-1 ring-gold-500/40"
            />
            <div className="mr-auto">
              <h2 className="text-2xl font-bold text-gold-400">
                {player.championName}
              </h2>
              <div className="text-sm text-gold-300/60">
                {player.displayName}
              </div>
            </div>
            {player.soloQueue && !player.error && (
              <dl className="flex gap-6 text-sm">
                <Stat
                  label="Ranga"
                  value={`${player.soloQueue.tier} ${player.soloQueue.rank}`}
                  sub={`${player.soloQueue.leaguePoints} LP`}
                />
                <Stat
                  label="Winrate"
                  value={`${winrate}%`}
                  sub={`${wins}W / ${games - wins}L`}
                />
                <Stat label="Gier" value={String(games)} sub="challenge" />
              </dl>
            )}
          </div>

          {player.puuid && !player.error && <MmrCard puuid={player.puuid} />}
        </div>

        {player.puuid && !player.error && (
          <PlayerRecords puuid={player.puuid} championId={player.championId} />
        )}
      </div>

      {player.puuid && !player.error && (
        <div className="mt-4">
          <PlayerAverages
            puuid={player.puuid}
            championId={player.championId}
            championName={player.championName}
            tier={player.soloQueue?.tier}
          />
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="text-right">
      <dt className="text-xs uppercase text-gold-300/50">{label}</dt>
      <dd className="font-semibold text-gold-300">{value}</dd>
      <dd className="text-xs text-gold-300/40">{sub}</dd>
    </div>
  );
}
