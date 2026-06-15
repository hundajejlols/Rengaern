// Snapshoty rangi w czasie. Riot API NIE daje historii LP, więc sami zapisujemy
// stan przy każdym odświeżeniu. Z różnic między snapshotami wyliczamy zmianę LP
// za pojedynczą grę oraz (docelowo) wykres progresu.
import { db, dbReady } from "./index";

export interface SnapshotInput {
  puuid: string;
  queue: string; // RANKED_SOLO_5x5
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface SnapshotRow extends SnapshotInput {
  id: number;
  created_at: number;
}

const TIERS = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
];
const DIV: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

/** Bezwzględna skala LP, żeby porównywać rangi mimo awansów (1 dywizja = 100). */
export function absoluteLp(
  tier: string,
  rank: string,
  leaguePoints: number,
): number {
  const idx = Math.max(0, TIERS.indexOf(tier.toUpperCase()));
  const apex = idx >= TIERS.indexOf("MASTER");
  const divPart = apex ? 0 : 4 - (DIV[rank.toUpperCase()] ?? 4);
  return (idx * 4 + divPart) * 100 + leaguePoints;
}

/** Zapisuje snapshot tylko, jeśli coś się zmieniło względem ostatniego. */
export async function recordSnapshot(input: SnapshotInput): Promise<void> {
  await dbReady;
  const res = await db.execute({
    sql: `SELECT tier, rank, league_points AS leaguePoints, wins, losses
            FROM rank_snapshots
           WHERE puuid = ? AND queue = ?
           ORDER BY created_at DESC LIMIT 1`,
    args: [input.puuid, input.queue],
  });
  const last = res.rows[0];
  if (
    last &&
    last.tier === input.tier &&
    last.rank === input.rank &&
    Number(last.leaguePoints) === input.leaguePoints &&
    Number(last.wins) === input.wins &&
    Number(last.losses) === input.losses
  ) {
    return; // bez zmian — nie duplikujemy
  }
  await db.execute({
    sql: `INSERT INTO rank_snapshots
            (puuid, queue, tier, rank, league_points, wins, losses, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.puuid,
      input.queue,
      input.tier,
      input.rank,
      input.leaguePoints,
      input.wins,
      input.losses,
      Date.now(),
    ],
  });
}

export async function getSnapshots(
  puuid: string,
  queue: string,
): Promise<SnapshotRow[]> {
  await dbReady;
  const res = await db.execute({
    sql: `SELECT id, puuid, queue, tier, rank, league_points AS leaguePoints,
                 wins, losses, created_at
            FROM rank_snapshots
           WHERE puuid = ? AND queue = ?
           ORDER BY created_at ASC`,
    args: [puuid, queue],
  });
  return res.rows.map((r) => ({
    id: Number(r.id),
    puuid: r.puuid as string,
    queue: r.queue as string,
    tier: r.tier as string,
    rank: r.rank as string,
    leaguePoints: Number(r.leaguePoints),
    wins: Number(r.wins),
    losses: Number(r.losses),
    created_at: Number(r.created_at),
  }));
}
