// Trwały cache rang SoloQ (Turso). Na serverless cache w pamięci ginie między
// wywołaniami, więc rangi (potrzebne masowo w MMR i szczegółach meczu) trzymamy
// też w bazie z krótkim TTL — dzięki temu po zimnym starcie nie odpytujemy
// Riota od zera dla kilkudziesięciu graczy.
import { db, dbReady } from "./index";
import type { LeagueEntry } from "@/lib/riot/types";

const TTL_MS = 30 * 60 * 1000; // 30 min

// null = świeży wpis "gracz bez rangi"; undefined = brak/nieaktualny wpis.
export async function getCachedRank(
  puuid: string,
): Promise<LeagueEntry | null | undefined> {
  await dbReady;
  const res = await db.execute({
    sql: `SELECT has_rank, tier, rank, league_points AS lp, wins, losses, updated_at
            FROM rank_cache WHERE puuid = ?`,
    args: [puuid],
  });
  const row = res.rows[0];
  if (!row) return undefined;
  if (Date.now() - Number(row.updated_at) > TTL_MS) return undefined; // nieaktualny
  if (!Number(row.has_rank)) return null;
  return {
    queueType: "RANKED_SOLO_5x5",
    tier: row.tier as string,
    rank: row.rank as string,
    leaguePoints: Number(row.lp),
    wins: Number(row.wins),
    losses: Number(row.losses),
  };
}

export async function setCachedRank(
  puuid: string,
  entry: LeagueEntry | null,
): Promise<void> {
  await dbReady;
  await db.execute({
    sql: `INSERT OR REPLACE INTO rank_cache
            (puuid, has_rank, tier, rank, league_points, wins, losses, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      puuid,
      entry ? 1 : 0,
      entry?.tier ?? null,
      entry?.rank ?? null,
      entry?.leaguePoints ?? null,
      entry?.wins ?? null,
      entry?.losses ?? null,
      Date.now(),
    ],
  });
}
