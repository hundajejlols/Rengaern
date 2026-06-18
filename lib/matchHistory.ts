// Match history logic: fetch match IDs (ranked SoloQ), pull details
// (from cache), reduce to a summary and filter only matches played with the
// assigned champion (Rengar / Ivern). Server only.
import { getMatchIdsByPuuid } from "@/lib/riot/api";
import { getCachedMatch } from "@/lib/db/matches";
import { performanceScore } from "@/lib/score";
import {
  championIconUrl,
  getLatestDdragonVersion,
  getRuneIcon,
  getRuneStyleIcon,
  getSummonerSpellIcon,
  itemIconUrl,
} from "@/lib/ddragon";
import type { MatchSummary } from "@/lib/types";

// Dominance label based on AI score difference (me - opponent in this role).
function dominanceLabel(diff: number): string {
  if (diff >= 4) return "Absolute domination";
  if (diff >= 2.5) return "Totally dominated";
  if (diff >= 1.2) return "Won lane";
  if (diff > -1.2) return "Even lane";
  if (diff > -2.5) return "Lost lane";
  if (diff > -4) return "Dominated";
  return "Stomped on lane";
}

interface Options {
  count?: number;
  /** If provided, return only matches played with this champion. */
  championId?: number;
  /** Epoch ms — ignore matches started before this moment (challenge start). */
  since?: number;
}

export async function getMatchHistory(
  puuid: string,
  { count = 20, championId, since }: Options = {},
): Promise<{ fetched: number; matches: MatchSummary[] }> {
  const ids = await getMatchIdsByPuuid(puuid, { count, queue: 420 });

  // Pobieramy szczegóły sekwencyjnie — throttle w kliencie Riota i tak je kolejkuje,
  // a większość trafi w cache SQLite.
  const version = await getLatestDdragonVersion();

  const summaries: MatchSummary[] = [];
  for (const id of ids) {
    const match = await getCachedMatch(id);
    const p = match.info.participants.find((x) => x.puuid === puuid);
    if (!p) continue;

    const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
    const minutes = match.info.gameDuration / 60;

    const myScore = performanceScore(
      p,
      match.info.participants,
      match.info.gameDuration,
    );

    // Przeciwnik z tej samej roli (przeciwna drużyna, ten sam teamPosition).
    let laneDiff: number | null = null;
    let laneLabel: string | null = null;
    let opponentChampion: string | null = null;
    if (p.teamPosition) {
      const opp = match.info.participants.find(
        (x) => x.teamId !== p.teamId && x.teamPosition === p.teamPosition,
      );
      if (opp) {
        const oppScore = performanceScore(
          opp,
          match.info.participants,
          match.info.gameDuration,
        );
        laneDiff = Math.round((myScore - oppScore) * 10) / 10;
        laneLabel = dominanceLabel(laneDiff);
        opponentChampion = opp.championName;
      }
    }

    const primary = p.perks.styles.find((s) => s.description === "primaryStyle");
    const sub = p.perks.styles.find((s) => s.description === "subStyle");
    const keystoneId = primary?.selections[0]?.perk;
    const [spell1, spell2, keystoneIcon, subStyleIcon] = await Promise.all([
      getSummonerSpellIcon(version, p.summoner1Id),
      getSummonerSpellIcon(version, p.summoner2Id),
      keystoneId ? getRuneIcon(version, keystoneId) : null,
      sub ? getRuneStyleIcon(version, sub.style) : null,
    ]);

    summaries.push({
      matchId: match.metadata.matchId,
      gameCreation: match.info.gameCreation,
      gameDuration: match.info.gameDuration,
      championId: p.championId,
      championName: p.championName,
      championIconUrl: championIconUrl(version, p.championName),
      champLevel: p.champLevel,
      summonerSpellIcons: [spell1, spell2],
      keystoneIcon,
      subStyleIcon,
      itemIcons: [
        p.item0,
        p.item1,
        p.item2,
        p.item3,
        p.item4,
        p.item5,
        p.item6,
      ].map((it) => itemIconUrl(version, it)),
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      kda:
        Math.round(((p.kills + p.assists) / Math.max(1, p.deaths)) * 100) / 100,
      cs,
      csPerMin: minutes > 0 ? Math.round((cs / minutes) * 10) / 10 : 0,
      damageToChampions: p.totalDamageDealtToChampions,
      goldEarned: p.goldEarned,
      visionScore: p.visionScore,
      aiScore: myScore,
      position: p.teamPosition ?? "",
      laneDiff,
      laneLabel,
      opponentChampion,
    });
  }

  // Najpierw odcinamy wszystko sprzed startu challenge'u — stare gry na innych
  // postaciach NIE liczą się jako zdrady.
  const inChallenge =
    since != null
      ? summaries.filter((m) => m.gameCreation >= since)
      : summaries;

  // fetched = liczba gier rozegranych w oknie challenge'u (przed filtrem championa).
  const filtered =
    championId != null
      ? inChallenge.filter((m) => m.championId === championId)
      : inChallenge;

  return { fetched: inChallenge.length, matches: filtered };
}
