// Wspólne typy współdzielone między API a frontendem.

export interface PlayerRankData {
  id: string;
  displayName: string;
  championName: string;
  championId: number;
  championIconUrl: string;
  puuid: string;
  // Ranked SoloQ — może być null, jeśli gracz nie ma jeszcze rankingu.
  soloQueue: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    winrate: number; // 0..100
    games: number;
  } | null;
  /** Błąd specyficzny dla tego gracza (np. zły Riot ID), reszta dashboardu działa dalej. */
  error?: string;
}

export interface PlayersResponse {
  ddragonVersion: string;
  players: PlayerRankData[];
}

// Pojedynczy mecz w historii (zredukowany do tego, co pokazujemy).
export interface MatchSummary {
  matchId: string;
  gameCreation: number; // ms epoch
  gameDuration: number; // sekundy
  championId: number;
  championName: string;
  championIconUrl: string;
  champLevel: number;
  summonerSpellIcons: (string | null)[];
  keystoneIcon: string | null;
  subStyleIcon: string | null;
  itemIcons: (string | null)[];
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number; // (k+a)/max(1,d)
  cs: number; // minions + neutral
  csPerMin: number;
  damageToChampions: number;
  goldEarned: number;
  visionScore: number;
  /** Własny performance score 0-10 (odpowiednik AI Score z deeplol). */
  aiScore: number;
  /** Pozycja: TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY | "" (brak danych). */
  position: string;
  /** Różnica AI score względem przeciwnika na tej samej roli (my - on). null = brak. */
  laneDiff: number | null;
  /** Etykieta dominacji nad laningowym przeciwnikiem (zależna od laneDiff). */
  laneLabel: string | null;
  /** Champion przeciwnika z tej samej roli (do podpisu). */
  opponentChampion: string | null;
  /**
   * Zmiana LP za tę grę, wyliczona ze snapshotów (różnica LP, gdy między dwoma
   * snapshotami była dokładnie 1 gra rankingowa). null = brak danych
   * (za mało snapshotów albo między grami zagrano kilka meczów naraz).
   */
  lpChange?: number | null;
}

// --- Szczegóły meczu: wszyscy gracze z pełnymi danymi ---
export interface MatchDetailPlayer {
  puuid: string;
  teamId: number; // 100 = niebiescy, 200 = czerwoni
  win: boolean;
  riotId: string; // "Nick#TAG"
  championName: string;
  championIconUrl: string;
  champLevel: number;
  summonerSpellIcons: (string | null)[]; // 2 czary
  keystoneIcon: string | null; // główna runa (keystone)
  subStyleIcon: string | null; // ikona drugiego drzewka run
  rank: string | null; // np. "SILVER II · 34 LP"
  aiScore: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  damageToChampions: number;
  cs: number;
  csPerMin: number;
  goldEarned: number;
  itemIcons: (string | null)[]; // 7 slotów (6 + ward)
}

export interface MatchDetailResponse {
  matchId: string;
  gameDuration: number;
  gameCreation: number;
  ddragonVersion: string;
  teams: {
    teamId: number;
    win: boolean;
    players: MatchDetailPlayer[];
  }[];
}

export interface MatchHistoryResponse {
  puuid: string;
  /** Champion, którym gracz MUSI grać w challenge — po nim filtrujemy. */
  championId: number;
  /** Liczba meczów pobranych z Riota (przed filtrowaniem po championie). */
  fetched: number;
  /** Mecze grane przypisanym championem (tylko te pokazujemy). */
  matches: MatchSummary[];
}
