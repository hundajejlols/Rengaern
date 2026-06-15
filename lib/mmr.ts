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

export async function estimateMmr(
  puuid: string,
  matchCount = 3,
): Promise<MmrEstimate> {
  // Ostatnie mecze ranked SoloQ tego gracza.
  const ids = await getMatchIdsByPuuid(puuid, { count: matchCount, queue: 420 });

  const values: number[] = [];
  let matchesUsed = 0;

  for (const id of ids) {
    const match = await getCachedMatch(id);
    matchesUsed++;
    for (const p of match.info.participants) {
      if (EXCLUDED_CHAMPS.has(p.championId)) continue; // pomijamy Rengara/Iverna
      const solo = await getSoloEntry(p.puuid);
      if (!solo) continue; // unranked -> pomijamy
      values.push(rankToValue(solo.tier, solo.rank, solo.leaguePoints));
    }
  }

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
