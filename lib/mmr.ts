// Szacowanie MMR gracza ze średniej rangi lobby.
// Bierzemy ostatnie N meczów na challenge-championie, zbieramy rangi SoloQ
// wszystkich graczy w tych meczach — POMIJAJĄC Rengara i Iverna (nasze postacie)
// — i uśredniamy. Matchmaking dobiera podobny poziom, więc to przybliża MMR.
import { PLAYERS } from "@/config/players";
import { getMatchIdsByPuuid, getSoloEntry } from "@/lib/riot/api";
import { getCachedMatch } from "@/lib/db/matches";
import { rankToValue, valueToRank } from "@/lib/rank";

// Championy wykluczane z liczenia (nasze challenge'owe postacie).
const EXCLUDED_CHAMPS = new Set(PLAYERS.map((p) => p.championId));

export interface MmrEstimate {
  estimatedRank: string | null; // czytelna ranga albo null, gdy brak danych
  sampleSize: number; // ilu graczy wzięto do średniej
  matchesUsed: number; // z ilu meczów
}

// Cache wyniku MMR — drogie liczenie, a zmienia się wolno (TTL 15 min).
const mmrCache = new Map<string, { value: MmrEstimate; ts: number }>();
const MMR_TTL_MS = 15 * 60 * 1000;

export async function estimateMmr(
  puuid: string,
  matchCount = 3,
): Promise<MmrEstimate> {
  const cached = mmrCache.get(puuid);
  if (cached && Date.now() - cached.ts < MMR_TTL_MS) return cached.value;

  const result = await computeMmr(puuid, matchCount);
  mmrCache.set(puuid, { value: result, ts: Date.now() });
  return result;
}

async function computeMmr(
  puuid: string,
  matchCount: number,
): Promise<MmrEstimate> {
  // Ostatnie mecze ranked SoloQ tego gracza.
  const ids = await getMatchIdsByPuuid(puuid, { count: matchCount, queue: 420 });

  // Mecze pobieramy równolegle (po cache to i tak tanie), potem zbieramy
  // unikalne PUUID-y graczy do oceny.
  const matches = await Promise.all(ids.map((id) => getCachedMatch(id)));
  const matchesUsed = matches.length;

  const opponents = new Set<string>();
  for (const match of matches) {
    for (const p of match.info.participants) {
      if (EXCLUDED_CHAMPS.has(p.championId)) continue; // pomijamy Rengara/Iverna
      opponents.add(p.puuid);
    }
  }

  // Rangi wszystkich graczy pobieramy RÓWNOLEGLE (pula klienta ogranicza liczbę
  // naraz) — to główne przyspieszenie względem pętli sekwencyjnej.
  const entries = await Promise.all(
    [...opponents].map((p) => getSoloEntry(p)),
  );
  const values = entries
    .filter((e) => e !== null)
    .map((e) => rankToValue(e!.tier, e!.rank, e!.leaguePoints));

  if (values.length === 0) {
    return { estimatedRank: null, sampleSize: 0, matchesUsed };
  }
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return {
    estimatedRank: valueToRank(avg),
    sampleSize: values.length,
    matchesUsed,
  };
}
