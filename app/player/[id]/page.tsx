"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { MatchHistoryResponse, PlayersResponse } from "@/lib/types";
import { MatchHistory } from "../../components/MatchHistory";
import { PlayerRecords } from "../../components/PlayerRecords";
import { RankTimeline } from "../../components/RankTimeline";
import { MmrCard } from "../../components/MmrCard";
import { NavBar } from "../../components/NavBar";

async function fetchPlayers(): Promise<PlayersResponse> {
  const res = await fetch("/api/players");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Błąd ${res.status}`);
  }
  return res.json();
}

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

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });

  const player = data?.players.find((p) => p.id === params.id);

  // Statystyki challenge'u (winrate / liczba gier) liczymy z meczów od startu
  // challenge'u, NIE z sezonowego bilansu konta z Riot API.
  const { data: matchData } = useQuery({
    queryKey: ["matches", player?.puuid, player?.championId],
    queryFn: () => fetchMatches(player!.puuid, player!.championId),
    enabled: Boolean(player?.puuid),
  });

  const challengeMatches = matchData?.matches ?? [];
  const challengeGames = challengeMatches.length;
  const challengeWins = challengeMatches.filter((m) => m.win).length;
  const challengeWinrate =
    challengeGames > 0
      ? Math.round((challengeWins / challengeGames) * 100)
      : 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <NavBar />

      {isLoading && <p className="text-gold-300/70">Ładowanie…</p>}

      {isError && (
        <div className="rounded-lg border border-red-700 bg-red-950/40 p-4 text-red-300">
          Błąd: {(error as Error).message}
        </div>
      )}

      {data && !player && (
        <p className="text-gold-300/70">Nie znaleziono gracza „{params.id}".</p>
      )}

      {player && (
        <>
          <div className="mb-6">
            <RankTimeline
              tier={player.soloQueue?.tier}
              rank={player.soloQueue?.rank}
              leaguePoints={player.soloQueue?.leaguePoints}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
          <section className="rounded-xl border border-navy-700 bg-navy-900 p-5">
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={player.championIconUrl}
                alt={player.championName}
                className="h-16 w-16 rounded-lg ring-1 ring-gold-500/40"
              />
              <div className="mr-auto">
                <h1 className="text-2xl font-bold text-gold-400">
                  {player.championName}
                </h1>
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
                    value={`${challengeWinrate}%`}
                    sub={`${challengeWins}W / ${challengeGames - challengeWins}L`}
                  />
                  <Stat
                    label="Gier"
                    value={String(challengeGames)}
                    sub="challenge"
                  />
                </dl>
              )}
            </div>

            {player.puuid && !player.error && (
              <MmrCard puuid={player.puuid} />
            )}
          </section>

          {player.puuid && !player.error && (
            <PlayerRecords
              puuid={player.puuid}
              championId={player.championId}
            />
          )}
          </div>

          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-gold-300">
              Historia meczów na {player.championName}
            </h2>
            {player.error ? (
              <p className="text-sm text-red-400">Błąd: {player.error}</p>
            ) : player.puuid ? (
              <MatchHistory
                puuid={player.puuid}
                championId={player.championId}
                championName={player.championName}
              />
            ) : (
              <p className="text-sm text-gold-300/50">Brak danych gracza.</p>
            )}
          </section>
        </>
      )}
    </main>
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
