// Heurystyka przypisania ról w aktualnej grze. SPECTATOR-V5 nie podaje pozycji,
// więc wnioskujemy je z czaru Smite (jungla) i tagów championa z Data Dragon.
// Wynik jest przybliżony, ale dobrze sortuje skład: top, jungle, mid, adc, supp.

export const ROLE_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const SMITE_ID = 11;

export interface RoleInput {
  puuid: string;
  tags: string[];
  spell1Id: number;
  spell2Id: number;
}

// Dopasowanie gracza do roli (im wyżej, tym pewniej). Smite dominuje dla jungli.
function affinity(p: RoleInput, role: string): number {
  const has = (t: string) => p.tags.includes(t);
  const smite = p.spell1Id === SMITE_ID || p.spell2Id === SMITE_ID;
  switch (role) {
    case "JUNGLE":
      return smite ? 100 : 0;
    case "BOTTOM":
      return has("Marksman") ? 80 : 0;
    case "UTILITY":
      return has("Support") ? 80 : 5;
    case "MIDDLE":
      return has("Mage") ? 55 : has("Assassin") ? 50 : 10;
    case "TOP":
      return has("Fighter") ? 45 : has("Tank") ? 40 : 15;
    default:
      return 0;
  }
}

/**
 * Przypisuje każdemu z 5 graczy unikalną rolę (greedy po największym dopasowaniu).
 * Zwraca mapę puuid -> rola.
 */
export function assignRoles(players: RoleInput[]): Record<string, string> {
  const pairs: { puuid: string; role: string; score: number }[] = [];
  for (const p of players) {
    for (const role of ROLE_ORDER) {
      pairs.push({ puuid: p.puuid, role, score: affinity(p, role) });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const result: Record<string, string> = {};
  const takenRoles = new Set<string>();
  for (const { puuid, role } of pairs) {
    if (result[puuid] || takenRoles.has(role)) continue;
    result[puuid] = role;
    takenRoles.add(role);
  }
  // Awaryjnie: gdyby ktoś został bez roli (np. <5 graczy), dosypujemy wolne role.
  const freeRoles = ROLE_ORDER.filter((r) => !takenRoles.has(r));
  for (const p of players) {
    if (!result[p.puuid]) result[p.puuid] = freeRoles.shift() ?? "TOP";
  }
  return result;
}
