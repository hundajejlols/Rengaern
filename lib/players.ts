// Allowlist PUUID-ów skonfigurowanych graczy.
// Bez tego ktokolwiek mógłby użyć naszego publicznego deployu (i naszego klucza
// Riot) jako darmowego proxy, odpytując dowolnych graczy i wyczerpując limity.
// Dlatego endpointy przyjmują tylko PUUID-y naszych challenge'owych graczy.
import { PLAYERS } from "@/config/players";
import { getAccountByRiotId } from "@/lib/riot/api";

let cache: { set: Set<string>; ts: number } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1h

export async function getAllowedPuuids(): Promise<Set<string>> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.set;
  const set = new Set<string>();
  await Promise.all(
    PLAYERS.map(async (p) => {
      try {
        const account = await getAccountByRiotId(p.gameName, p.tagLine);
        set.add(account.puuid);
      } catch {
        /* gracz tymczasowo nierozwiązywalny — pomijamy, nie blokujemy reszty */
      }
    }),
  );
  // Cache'ujemy tylko, gdy cokolwiek się rozwiązało (unikamy zamrożenia pustego setu).
  if (set.size > 0) cache = { set, ts: Date.now() };
  return set;
}

export async function isAllowedPuuid(puuid: string): Promise<boolean> {
  return (await getAllowedPuuids()).has(puuid);
}
