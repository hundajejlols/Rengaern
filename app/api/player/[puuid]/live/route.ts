// GET /api/player/[puuid]/live — aktualna gra gracza (SPECTATOR-V5).
// Jeśli gracz jest w grze, zwraca wszystkich 10 uczestników z postacią,
// czarami, runami i rangą. Inaczej { inGame: false }.
import { NextResponse } from "next/server";
import { getActiveGame, getSoloEntry } from "@/lib/riot/api";
import { isAllowedPuuid, getAllowedPuuids } from "@/lib/players";
import { RiotApiError } from "@/lib/riot/client";
import {
  getChampionById,
  getLatestDdragonVersion,
  getRuneIcon,
  getRuneStyleIcon,
  getSummonerSpellIcon,
} from "@/lib/ddragon";
import { assignRoles, ROLE_ORDER } from "@/lib/liveRoles";
import type { LiveGameResponse, LiveParticipant } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ puuid: string }> },
) {
  if (!process.env.RIOT_API_KEY) {
    return NextResponse.json(
      { error: "Brak RIOT_API_KEY. Ustaw klucz w pliku .env." },
      { status: 500 },
    );
  }

  const { puuid } = await params;
  if (!(await isAllowedPuuid(puuid))) {
    return NextResponse.json(
      { error: "Nieautoryzowany gracz." },
      { status: 403 },
    );
  }

  try {
    const game = await getActiveGame(puuid);
    if (!game) {
      const empty: LiveGameResponse = {
        inGame: false,
        gameLength: 0,
        gameMode: "",
        queueId: null,
        teams: [],
      };
      return NextResponse.json(empty);
    }

    const [version, allowed] = await Promise.all([
      getLatestDdragonVersion(),
      getAllowedPuuids(),
    ]);

    // Wzbogacamy uczestników (z tagami + czarami do wnioskowania roli).
    const enriched = await Promise.all(
      game.participants.map(async (p) => {
        const keystoneId = p.perks?.perkIds?.[0];
        const [champ, spell1, spell2, keystoneIcon, subStyleIcon, rank] =
          await Promise.all([
            getChampionById(version, p.championId),
            getSummonerSpellIcon(version, p.spell1Id),
            getSummonerSpellIcon(version, p.spell2Id),
            keystoneId ? getRuneIcon(version, keystoneId) : null,
            p.perks ? getRuneStyleIcon(version, p.perks.perkSubStyle) : null,
            getSoloEntry(p.puuid),
          ]);
        const lp: LiveParticipant = {
          puuid: p.puuid,
          teamId: p.teamId,
          riotId: p.riotId ?? champ?.name ?? "Gracz",
          championName: champ?.name ?? `#${p.championId}`,
          championIconUrl: champ?.iconUrl ?? null,
          summonerSpellIcons: [spell1, spell2],
          keystoneIcon,
          subStyleIcon,
          rank: rank
            ? `${rank.tier} ${rank.rank} · ${rank.leaguePoints} LP`
            : null,
          position: "",
          isTracked: allowed.has(p.puuid),
        };
        return { lp, tags: champ?.tags ?? [], spell1Id: p.spell1Id, spell2Id: p.spell2Id };
      }),
    );

    const teamIds = [...new Set(enriched.map((e) => e.lp.teamId))];
    const teams = teamIds.map((teamId) => {
      const members = enriched.filter((e) => e.lp.teamId === teamId);
      // Wnioskujemy role w obrębie drużyny i sortujemy: top, jg, mid, adc, supp.
      const roles = assignRoles(
        members.map((m) => ({
          puuid: m.lp.puuid,
          tags: m.tags,
          spell1Id: m.spell1Id,
          spell2Id: m.spell2Id,
        })),
      );
      const players = members.map((m) => ({
        ...m.lp,
        position: roles[m.lp.puuid] ?? "",
      }));
      players.sort(
        (a, b) => ROLE_ORDER.indexOf(a.position) - ROLE_ORDER.indexOf(b.position),
      );
      return { teamId, players };
    });

    const body: LiveGameResponse = {
      inGame: true,
      gameLength: game.gameLength,
      gameMode: game.gameMode,
      queueId: game.gameQueueConfigId ?? null,
      teams,
    };
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof RiotApiError ? err.status : 500;
    const message =
      err instanceof RiotApiError ? `Riot API ${err.status}` : "Błąd serwera";
    return NextResponse.json({ error: message }, { status });
  }
}
