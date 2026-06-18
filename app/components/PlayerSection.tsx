"use client";

import type { PlayerRankData } from "@/lib/types";
import { PlayerAverages } from "./PlayerAverages";
import { PlayerRecords } from "./PlayerRecords";
import { RankTimeline } from "./RankTimeline";

// Full profile of a single player (without the live section and navigation) —
// used on the combined dashboard for both players at once.
export function PlayerSection({ player }: { player: PlayerRankData }) {
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
                  label="Rank"
                  value={`${player.soloQueue.tier} ${player.soloQueue.rank}`}
                  sub={`${player.soloQueue.leaguePoints} LP`}
                />
              </dl>
            )}
          </div>
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
