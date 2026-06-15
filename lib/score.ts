// Własny "performance score" 0-10 per mecz — odpowiednik AI Score z deeplol.
// Liczony WZGLĘDEM reszty lobby (mamy w cache wszystkich 10 uczestników), bo
// surowy KDA bez kontekstu nic nie mówi. Wagi są celowo wystawione na górze,
// żeby łatwo dostroić po porównaniu z deeplol.
import type { Participant } from "./riot/types";

// Wagi poszczególnych komponentów (suma = 1.0).
const WEIGHTS = {
  killParticipation: 0.22, // udział w zabójstwach drużyny
  damageShare: 0.24, // udział w obrażeniach w bohaterów
  kda: 0.24, // (K+A)/D
  cs: 0.14, // CS na minutę
  vision: 0.08, // wizja na minutę
  gold: 0.08, // udział w złocie drużyny
};

// "Sufity" — wartość, przy której dany komponent daje maksimum (10/10).
const CAP = {
  killParticipation: 0.65, // 65% KP = max
  damageShare: 0.3, // 30% dmg drużyny = max
  kda: 6, // KDA 6+ = max
  csPerMin: 9,
  visionPerMin: 2.2,
  goldShare: 0.28,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * @param p          uczestnik, dla którego liczymy score (nasz gracz)
 * @param all        wszyscy uczestnicy meczu (do udziałów drużynowych)
 * @param durationSec długość gry w sekundach
 * @returns score 0-10 z jednym miejscem po przecinku
 */
export function performanceScore(
  p: Participant,
  all: Participant[],
  durationSec: number,
): number {
  const minutes = Math.max(1, durationSec / 60);
  const team = all.filter((x) => x.teamId === p.teamId);

  const teamKills = team.reduce((s, x) => s + x.kills, 0);
  const teamDmg = team.reduce((s, x) => s + x.totalDamageDealtToChampions, 0);
  const teamGold = team.reduce((s, x) => s + x.goldEarned, 0);

  const kp =
    teamKills > 0 ? (p.kills + p.assists) / teamKills : 0;
  const dmgShare = teamDmg > 0 ? p.totalDamageDealtToChampions / teamDmg : 0;
  const goldShare = teamGold > 0 ? p.goldEarned / teamGold : 0;
  const kda = (p.kills + p.assists) / Math.max(1, p.deaths);
  const csPerMin = (p.totalMinionsKilled + p.neutralMinionsKilled) / minutes;
  const visionPerMin = p.visionScore / minutes;

  // Każdy komponent normalizowany do 0..1 względem swojego "sufitu".
  const components = {
    killParticipation: clamp01(kp / CAP.killParticipation),
    damageShare: clamp01(dmgShare / CAP.damageShare),
    kda: clamp01(kda / CAP.kda),
    cs: clamp01(csPerMin / CAP.csPerMin),
    vision: clamp01(visionPerMin / CAP.visionPerMin),
    gold: clamp01(goldShare / CAP.goldShare),
  };

  let base = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    base += WEIGHTS[key] * components[key];
  }
  let score = base * 10; // skala 0..10

  // Kara za dużą liczbę śmierci (deeplol mocno karze "feedowanie").
  score -= Math.min(2, p.deaths * 0.25);
  // Drobny bonus za wygraną (wkład w zwycięstwo).
  if (p.win) score += 0.3;

  return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10;
}
