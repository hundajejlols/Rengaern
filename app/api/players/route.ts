// GET /api/players — zbiorcze dane rankingowe do dashboardu.
// Przepływ dla każdego gracza: Riot ID -> PUUID -> ranked SoloQ.
// Błąd jednego gracza nie wywala całego dashboardu (zwracamy per-player error).
import { NextResponse } from "next/server";
import { PLAYERS } from "@/config/players";
import {
  getAccountByRiotId,
  getLeagueEntriesByPuuid,
  pickSoloQueue,
} from "@/lib/riot/api";
import { RiotApiError } from "@/lib/riot/client";
import { recordSnapshot } from "@/lib/db/snapshots";
import { championIconUrl, getLatestDdragonVersion } from "@/lib/ddragon";
import type { PlayerRankData, PlayersResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.RIOT_API_KEY) {
    return NextResponse.json(
      { error: "Brak RIOT_API_KEY. Ustaw klucz w pliku .env." },
      { status: 500 },
    );
  }

  const version = await getLatestDdragonVersion();

  const players: PlayerRankData[] = await Promise.all(
    PLAYERS.map(async (p): Promise<PlayerRankData> => {
      const base = {
        id: p.id,
        displayName: p.displayName,
        championName: p.championName,
        championId: p.championId,
        championIconUrl: championIconUrl(version, p.championName),
      };
      try {
        const account = await getAccountByRiotId(p.gameName, p.tagLine);
        const entries = await getLeagueEntriesByPuuid(account.puuid);
        const solo = pickSoloQueue(entries);
        const games = solo ? solo.wins + solo.losses : 0;
        // Zapis snapshotu rangi (do historii LP i zmian LP za grę).
        if (solo) {
          await recordSnapshot({
            puuid: account.puuid,
            queue: "RANKED_SOLO_5x5",
            tier: solo.tier,
            rank: solo.rank,
            leaguePoints: solo.leaguePoints,
            wins: solo.wins,
            losses: solo.losses,
          });
        }
        return {
          ...base,
          puuid: account.puuid,
          soloQueue: solo
            ? {
                tier: solo.tier,
                rank: solo.rank,
                leaguePoints: solo.leaguePoints,
                wins: solo.wins,
                losses: solo.losses,
                games,
                winrate: games > 0 ? Math.round((solo.wins / games) * 100) : 0,
              }
            : null,
        };
      } catch (err) {
        const message =
          err instanceof RiotApiError
            ? `Riot API ${err.status}`
            : "Unknown error";
        return { ...base, puuid: "", soloQueue: null, error: message };
      }
    }),
  );

  const body: PlayersResponse = { ddragonVersion: version, players };
  return NextResponse.json(body);
}
