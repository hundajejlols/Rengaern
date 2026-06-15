// Cache szczegółów meczów. Mecze są niezmienne, więc cache trzymamy na stałe.
import { db, dbReady } from "./index";
import { getMatch } from "@/lib/riot/api";
import { matchSchema, type Match } from "@/lib/riot/types";

/** Zwraca mecz z cache albo pobiera z Riota i zapisuje. */
export async function getCachedMatch(matchId: string): Promise<Match> {
  await dbReady;
  const res = await db.execute({
    sql: "SELECT data FROM match_cache WHERE match_id = ?",
    args: [matchId],
  });
  if (res.rows.length > 0) {
    return matchSchema.parse(JSON.parse(res.rows[0].data as string));
  }

  const match = await getMatch(matchId);
  await db.execute({
    sql: "INSERT OR REPLACE INTO match_cache (match_id, data, created_at) VALUES (?, ?, ?)",
    args: [matchId, JSON.stringify(match), Date.now()],
  });
  return match;
}
