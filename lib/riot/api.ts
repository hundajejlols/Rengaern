// Funkcje per endpoint Riot API. Pamiętaj o routingu:
//  - ACCOUNT-V1 i MATCH-V5 -> REGIONAL_HOST (europe)
//  - LEAGUE-V4              -> PLATFORM_HOST (euw1)
import { riotGet } from "./client";
import { PLATFORM_HOST, REGIONAL_HOST } from "./routing";
import {
  accountSchema,
  leagueEntriesSchema,
  matchIdsSchema,
  matchSchema,
  type Account,
  type LeagueEntry,
  type Match,
} from "./types";
import { getCachedRank, setCachedRank } from "@/lib/db/ranks";

/** Riot ID (gameName#tagLine) -> konto z PUUID. */
export function getAccountByRiotId(
  gameName: string,
  tagLine: string,
): Promise<Account> {
  const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName,
  )}/${encodeURIComponent(tagLine)}`;
  return riotGet(REGIONAL_HOST, path, accountSchema);
}

/** PUUID -> wpisy rankingu (SoloQ + Flex). */
export function getLeagueEntriesByPuuid(
  puuid: string,
): Promise<LeagueEntry[]> {
  const path = `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
  return riotGet(PLATFORM_HOST, path, leagueEntriesSchema);
}

/** PUUID -> lista ID meczów (domyślnie ranked SoloQ, queue 420). */
export function getMatchIdsByPuuid(
  puuid: string,
  { start = 0, count = 20, queue = 420 } = {},
): Promise<string[]> {
  const params = new URLSearchParams({
    start: String(start),
    count: String(count),
    queue: String(queue),
  });
  const path = `/lol/match/v5/matches/by-puuid/${encodeURIComponent(
    puuid,
  )}/ids?${params.toString()}`;
  return riotGet(REGIONAL_HOST, path, matchIdsSchema);
}

/** matchId -> szczegóły meczu. Mecze są niezmienne -> nadają się do cache na stałe. */
export function getMatch(matchId: string): Promise<Match> {
  const path = `/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  return riotGet(REGIONAL_HOST, path, matchSchema);
}

/** Pomocniczo: wyciąga wpis SoloQ z listy wpisów ligowych. */
export function pickSoloQueue(entries: LeagueEntry[]): LeagueEntry | undefined {
  return entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
}

// Cache wpisów SoloQ per puuid (krótki TTL) — w szczegółach meczu i szacowaniu
// MMR pytamy o rangę wielu graczy, więc nie odpytujemy Riota za każdym razem.
const soloCache = new Map<string, { value: LeagueEntry | null; ts: number }>();
const RANK_TTL_MS = 10 * 60 * 1000;

/**
 * Zwraca wpis SoloQ gracza (tier/rank/LP) albo null. Best-effort, dwupoziomowy
 * cache: pamięć (szybko w obrębie wywołania) + baza (przetrwa zimny start na
 * serverless). Dopiero przy braku świeżego wpisu pytamy Riota.
 */
export async function getSoloEntry(
  puuid: string,
): Promise<LeagueEntry | null> {
  const mem = soloCache.get(puuid);
  if (mem && Date.now() - mem.ts < RANK_TTL_MS) return mem.value;

  const fromDb = await getCachedRank(puuid);
  if (fromDb !== undefined) {
    soloCache.set(puuid, { value: fromDb, ts: Date.now() });
    return fromDb;
  }

  try {
    const entries = await getLeagueEntriesByPuuid(puuid);
    const value = pickSoloQueue(entries) ?? null;
    soloCache.set(puuid, { value, ts: Date.now() });
    await setCachedRank(puuid, value);
    return value;
  } catch {
    return null; // brak rangi nie psuje widoku
  }
}

/** Sformatowana ranga SoloQ (np. "SILVER II · 34 LP") albo null. */
export async function getSoloRankString(
  puuid: string,
): Promise<string | null> {
  const solo = await getSoloEntry(puuid);
  return solo ? `${solo.tier} ${solo.rank} · ${solo.leaguePoints} LP` : null;
}
