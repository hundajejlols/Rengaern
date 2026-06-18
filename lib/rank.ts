// Rank <-> numeric value conversion, to be able to average ranks (MMR estimate).
// Scale: 1 division = 100 "points" + actual LP within the division.

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

const TIER_NAMES: Record<string, string> = {
  IRON: "Iron",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  EMERALD: "Emerald",
  DIAMOND: "Diamond",
  MASTER: "Master",
  GRANDMASTER: "Grandmaster",
  CHALLENGER: "Challenger",
};

/** Rank -> numeric value. */
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

/** Numeric value -> readable rank (e.g. "Gold II · 34 LP"). */
export function valueToRank(value: number): string {
  const v = Math.max(0, Math.round(value));
  const units = Math.floor(v / 100);
  const lp = v - units * 100;
  let tierIdx = Math.floor(units / 4);
  const divPart = units % 4;

  if (tierIdx >= MASTER_IDX) {
    tierIdx = Math.min(tierIdx, TIERS.length - 1);
    return `${TIER_NAMES[TIERS[tierIdx]]} · ${lp} LP`;
  }
  const divNum = 4 - divPart; // divPart 0 -> IV, 3 -> I
  return `${TIER_NAMES[TIERS[tierIdx]]} ${NUM_TO_ROMAN[divNum]} · ${lp} LP`;
}
