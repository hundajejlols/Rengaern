// Konwersja rangi <-> wartość liczbowa, żeby móc uśredniać rangi (szacowanie MMR).
// Skala: 1 dywizja = 100 "punktów" + faktyczne LP w obrębie dywizji.

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
const MASTER_IDX = TIERS.indexOf("MASTER");
const DIV_TO_NUM: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };
const NUM_TO_ROMAN = ["", "I", "II", "III", "IV"];

const TIER_PL: Record<string, string> = {
  IRON: "Iron",
  BRONZE: "Brąz",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platyna",
  EMERALD: "Emerald",
  DIAMOND: "Diament",
  MASTER: "Master",
  GRANDMASTER: "Grandmaster",
  CHALLENGER: "Challenger",
};

/** Ranga -> wartość liczbowa. */
export function rankToValue(
  tier: string,
  rank: string,
  leaguePoints: number,
): number {
  const idx = Math.max(0, TIERS.indexOf(tier.toUpperCase()));
  const apex = idx >= MASTER_IDX;
  const divPart = apex ? 0 : 4 - (DIV_TO_NUM[rank.toUpperCase()] ?? 4);
  return (idx * 4 + divPart) * 100 + leaguePoints;
}

/** Wartość liczbowa -> czytelna ranga (np. "Gold II · 34 LP"). */
export function valueToRank(value: number): string {
  const v = Math.max(0, Math.round(value));
  const units = Math.floor(v / 100);
  const lp = v - units * 100;
  let tierIdx = Math.floor(units / 4);
  const divPart = units % 4;

  if (tierIdx >= MASTER_IDX) {
    tierIdx = Math.min(tierIdx, TIERS.length - 1);
    return `${TIER_PL[TIERS[tierIdx]]} · ${lp} LP`;
  }
  const divNum = 4 - divPart; // divPart 0 -> IV, 3 -> I
  return `${TIER_PL[TIERS[tierIdx]]} ${NUM_TO_ROMAN[divNum]} · ${lp} LP`;
}
