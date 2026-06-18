// GET /api/player/[puuid]/matches?champion=107&count=20
// Zwraca historię ranked SoloQ gracza, odfiltrowaną do meczów granych
// przypisanym championem (challenge: Rengar / Ivern).
import { NextResponse, type NextRequest } from "next/server";
import { getMatchHistory } from "@/lib/matchHistory";
import { CHALLENGE_START_MS } from "@/config/players";
import { RiotApiError } from "@/lib/riot/client";
import { absoluteLp, getSnapshots } from "@/lib/db/snapshots";
import { isAllowedPuuid } from "@/lib/players";
import type { MatchSummary } from "@/lib/types";

// Dokleja zmianę LP do każdego meczu na podstawie snapshotów.
// LP za grę = różnica LP między snapshotem tuż przed a tuż po grze,
// o ile w tym oknie była dokładnie 1 gra rankingowa.
async function attachLpChanges(
  puuid: string,
  matches: MatchSummary[],
): Promise<MatchSummary[]> {
  const snaps = await getSnapshots(puuid, "RANKED_SOLO_5x5");
  if (snaps.length < 2) return matches.map((m) => ({ ...m, lpChange: null }));

  const series = snaps.map((s) => ({
    t: s.created_at,
    games: s.wins + s.losses,
    abs: absoluteLp(s.tier, s.rank, s.leaguePoints),
  }));

  return matches.map((m) => {
    const matchEnd = m.gameCreation + m.gameDuration * 1000;
    const bIdx = series.findIndex((s) => s.t >= matchEnd);
    if (bIdx <= 0) return { ...m, lpChange: null };
    const a = series[bIdx - 1];
    const b = series[bIdx];
    if (b.games - a.games !== 1) return { ...m, lpChange: null };
    return { ...m, lpChange: b.abs - a.abs };
  });
}
import type { MatchHistoryResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
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
  const sp = req.nextUrl.searchParams;
  const championId = sp.has("champion") ? Number(sp.get("champion")) : undefined;
  const count = sp.has("count")
    ? Math.min(Math.max(Number(sp.get("count")), 1), 100)
    : 20;

  try {
    const { fetched, matches } = await getMatchHistory(puuid, {
      count,
      championId,
      since: CHALLENGE_START_MS,
    });
    const body: MatchHistoryResponse = {
      puuid,
      championId: championId ?? 0,
      fetched,
      matches: await attachLpChanges(puuid, matches),
    };
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof RiotApiError ? err.status : 500;
    const message =
      err instanceof RiotApiError ? `Riot API ${err.status}` : "Server error";
    return NextResponse.json({ error: message }, { status });
  }
}
