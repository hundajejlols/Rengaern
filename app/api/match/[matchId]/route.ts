// GET /api/match/[matchId] — pełne szczegóły meczu: wszyscy gracze z postacią,
// poziomem, czarami, runami, rangą, AI score, statystykami, dmg, CS i itemami.
import { NextResponse } from "next/server";
import { getCachedMatch } from "@/lib/db/matches";
import { getSoloRankString } from "@/lib/riot/api";
import { getAllowedPuuids } from "@/lib/players";
import { RiotApiError } from "@/lib/riot/client";
import { performanceScore } from "@/lib/score";
import {
  championIconUrl,
  getLatestDdragonVersion,
  getRuneIcon,
  getRuneStyleIcon,
  getSummonerSpellIcon,
  itemIconUrl,
} from "@/lib/ddragon";
import type { MatchDetailPlayer, MatchDetailResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  if (!process.env.RIOT_API_KEY) {
    return NextResponse.json(
      { error: "Brak RIOT_API_KEY. Ustaw klucz w pliku .env." },
      { status: 500 },
    );
  }

  const { matchId } = await params;

  try {
    const [match, version, allowed] = await Promise.all([
      getCachedMatch(matchId),
      getLatestDdragonVersion(),
      getAllowedPuuids(),
    ]);
    const all = match.info.participants;
    // Pokazujemy tylko mecze, w których brał udział nasz challenge'owy gracz.
    if (!all.some((p) => allowed.has(p.puuid))) {
      return NextResponse.json(
        { error: "Nieautoryzowany mecz." },
        { status: 403 },
      );
    }
    const duration = match.info.gameDuration;
    const minutes = Math.max(1, duration / 60);

    const players: MatchDetailPlayer[] = await Promise.all(
      all.map(async (p): Promise<MatchDetailPlayer> => {
        const primary = p.perks.styles.find(
          (s) => s.description === "primaryStyle",
        );
        const sub = p.perks.styles.find((s) => s.description === "subStyle");
        const keystoneId = primary?.selections[0]?.perk;

        const [spell1, spell2, keystoneIcon, subStyleIcon, rank] =
          await Promise.all([
            getSummonerSpellIcon(version, p.summoner1Id),
            getSummonerSpellIcon(version, p.summoner2Id),
            keystoneId ? getRuneIcon(version, keystoneId) : null,
            sub ? getRuneStyleIcon(version, sub.style) : null,
            getSoloRankString(p.puuid),
          ]);

        const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
        return {
          puuid: p.puuid,
          teamId: p.teamId,
          win: p.win,
          riotId: p.riotIdGameName
            ? `${p.riotIdGameName}#${p.riotIdTagline ?? ""}`
            : p.championName,
          championName: p.championName,
          championIconUrl: championIconUrl(version, p.championName),
          champLevel: p.champLevel,
          summonerSpellIcons: [spell1, spell2],
          keystoneIcon,
          subStyleIcon,
          rank,
          aiScore: performanceScore(p, all, duration),
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          kda:
            Math.round(
              ((p.kills + p.assists) / Math.max(1, p.deaths)) * 100,
            ) / 100,
          damageToChampions: p.totalDamageDealtToChampions,
          cs,
          csPerMin: Math.round((cs / minutes) * 10) / 10,
          goldEarned: p.goldEarned,
          itemIcons: [
            p.item0,
            p.item1,
            p.item2,
            p.item3,
            p.item4,
            p.item5,
            p.item6,
          ].map((id) => itemIconUrl(version, id)),
        };
      }),
    );

    const teamIds = [...new Set(players.map((p) => p.teamId))];
    const body: MatchDetailResponse = {
      matchId,
      gameDuration: duration,
      gameCreation: match.info.gameCreation,
      ddragonVersion: version,
      teams: teamIds.map((teamId) => {
        const teamPlayers = players.filter((p) => p.teamId === teamId);
        return {
          teamId,
          win: teamPlayers[0]?.win ?? false,
          players: teamPlayers,
        };
      }),
    };
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof RiotApiError ? err.status : 500;
    const message =
      err instanceof RiotApiError ? `Riot API ${err.status}` : "Błąd serwera";
    return NextResponse.json({ error: message }, { status });
  }
}
