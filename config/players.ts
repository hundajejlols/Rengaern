// Edytowalna lista graczy biorących udział w challenge.
// Żeby dodać kolejnego gracza, dopisz wpis do tablicy — reszta aplikacji
// (dashboard, leaderboard, snapshoty) działa generycznie na tej konfiguracji.

export interface PlayerConfig {
  /** Unikalny, stabilny identyfikator gracza w naszej aplikacji. */
  id: string;
  /** Wyświetlana nazwa. */
  displayName: string;
  /** Riot ID — część przed "#". */
  gameName: string;
  /** Riot ID — tagLine, część po "#". */
  tagLine: string;
  /** Nazwa przypisanego championa (do UI / Data Dragon). */
  championName: string;
  /** ID przypisanego championa — po nim sprawdzamy compliance. */
  championId: number;
}

// Data i godzina startu challenge'u (czas lokalny serwera, format ISO 8601).
// Konta są stare i miały mnóstwo gier innymi postaciami — te NIE liczą się jako
// zdrady. Liczymy i pokazujemy WYŁĄCZNIE mecze rozegrane od tego momentu.
// Zmień tę wartość na realny start challenge'u.
export const CHALLENGE_START = "2026-06-15T18:00:00";

/** Start challenge'u jako epoch ms — do porównań z gameCreation z Riot API. */
export const CHALLENGE_START_MS = new Date(CHALLENGE_START).getTime();

export const PLAYERS: PlayerConfig[] = [
  {
    id: "kaijinzerd",
    displayName: "Kaijinzerd",
    gameName: "Kaijinzerd",
    tagLine: "EUW",
    championName: "Rengar",
    championId: 107,
  },
  {
    id: "p3henomenal",
    displayName: "P3henomenal",
    gameName: "P3henomenal",
    tagLine: "EUW",
    championName: "Ivern",
    championId: 427,
  },
];

export function getPlayerById(id: string): PlayerConfig | undefined {
  return PLAYERS.find((p) => p.id === id);
}
