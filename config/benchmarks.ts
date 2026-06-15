// Baseline'y referencyjne (per postać + rola + RANGA) do porównania statystyk
// gracza ze średnią graczy na tej samej postaci/roli/randze.
//
// Źródło: lolalytics.com (build championa, lane + tier), pobrane 2026-06-15 dla
// wszystkich progów Silver→Master. Dzięki temu porównanie pozostaje trafne przez
// cały challenge — aplikacja dobiera bracket do AKTUALNEJ rangi gracza.
//
// damage = suma Physical + Magic + True (lolalytics rozbija je osobno).
// UWAGA: lolalytics raportuje dla Iverna bardzo niski CS (quirk postaci/danych).
//
// Jak odświeżyć: poproś o ponowne ściągnięcie albo przepisz ręcznie ze strony
// lolalytics.com/lol/<champ>/build/?tier=<tier>&lane=<lane>.

export interface BenchmarkStat {
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
}

export interface ChampionBenchmarks {
  championId: number;
  championName: string;
  lane: string;
  source: string;
  capturedAt: string;
  /** Statystyki per bracket rangowy (slug lolalytics). */
  tiers: Record<string, BenchmarkStat>;
}

export const BENCHMARKS: ChampionBenchmarks[] = [
  {
    championId: 107,
    championName: "Rengar",
    lane: "jungle",
    source: "lolalytics.com",
    capturedAt: "2026-06-15",
    tiers: {
      silver: { kills: 9.43, deaths: 7.85, assists: 5.93, cs: 160.57, gold: 13890, damage: 24073 },
      gold: { kills: 9.73, deaths: 7.7, assists: 6.11, cs: 166.77, gold: 14226, damage: 24927 },
      platinum: { kills: 9.79, deaths: 7.47, assists: 6.2, cs: 171.03, gold: 14339, damage: 25207 },
      emerald: { kills: 9.84, deaths: 7.11, assists: 6.3, cs: 173.8, gold: 14341, damage: 25276 },
      diamond: { kills: 9.72, deaths: 6.68, assists: 6.35, cs: 176.03, gold: 14159, damage: 24735 },
      master: { kills: 9.15, deaths: 6.16, assists: 6.28, cs: 173.61, gold: 13623, damage: 23120 },
    },
  },
  {
    championId: 427,
    championName: "Ivern",
    lane: "middle",
    source: "lolalytics.com",
    capturedAt: "2026-06-15",
    tiers: {
      silver: { kills: 4.99, deaths: 5.74, assists: 8.65, cs: 4.44, gold: 10292, damage: 21037 },
      gold: { kills: 3.88, deaths: 5.55, assists: 10.83, cs: 4.86, gold: 10126, damage: 18464 },
      platinum: { kills: 3.54, deaths: 5.63, assists: 10.93, cs: 4.04, gold: 10175, damage: 18945 },
      emerald: { kills: 4.22, deaths: 5.72, assists: 9.71, cs: 5.61, gold: 10322, damage: 20498 },
      diamond: { kills: 3.93, deaths: 5.02, assists: 10.54, cs: 4.88, gold: 10217, damage: 16908 },
      master: { kills: 3.23, deaths: 5.5, assists: 11.5, cs: 1.15, gold: 9118, damage: 15290 },
    },
  },
];

// Mapowanie rangi Riot -> dostępny bracket lolalytics (mamy Silver→Master).
function tierToBracket(riotTier?: string): string {
  switch ((riotTier ?? "").toUpperCase()) {
    case "IRON":
    case "BRONZE":
    case "SILVER":
      return "silver";
    case "GOLD":
      return "gold";
    case "PLATINUM":
      return "platinum";
    case "EMERALD":
      return "emerald";
    case "DIAMOND":
      return "diamond";
    case "MASTER":
    case "GRANDMASTER":
    case "CHALLENGER":
      return "master";
    default:
      return "silver";
  }
}

export interface ResolvedBenchmark extends BenchmarkStat {
  championName: string;
  lane: string;
  bracket: string;
  source: string;
  capturedAt: string;
}

/** Zwraca baseline dla championa dobrany do aktualnej rangi gracza. */
export function getBenchmark(
  championId: number,
  riotTier?: string,
): ResolvedBenchmark | undefined {
  const champ = BENCHMARKS.find((b) => b.championId === championId);
  if (!champ) return undefined;
  const bracket = tierToBracket(riotTier);
  const stat = champ.tiers[bracket] ?? champ.tiers.silver;
  return {
    ...stat,
    championName: champ.championName,
    lane: champ.lane,
    bracket,
    source: champ.source,
    capturedAt: champ.capturedAt,
  };
}

/** KDA z benchmarku: (K+A)/D (lub K+A przy 0 śmierci). */
export function benchmarkKda(b: BenchmarkStat): number {
  return b.deaths > 0 ? (b.kills + b.assists) / b.deaths : b.kills + b.assists;
}
