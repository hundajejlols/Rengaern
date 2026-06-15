// Schematy zod dla odpowiedzi Riot API. Walidujemy tylko pola, których używamy.
import { z } from "zod";

// ACCOUNT-V1: Riot ID -> PUUID
export const accountSchema = z.object({
  puuid: z.string(),
  gameName: z.string().optional(),
  tagLine: z.string().optional(),
});
export type Account = z.infer<typeof accountSchema>;

// LEAGUE-V4: wpis rankingu dla danej kolejki
export const leagueEntrySchema = z.object({
  queueType: z.string(), // RANKED_SOLO_5x5 | RANKED_FLEX_SR
  tier: z.string(), // IRON..CHALLENGER
  rank: z.string(), // I..IV
  leaguePoints: z.number(),
  wins: z.number(),
  losses: z.number(),
});
export type LeagueEntry = z.infer<typeof leagueEntrySchema>;

export const leagueEntriesSchema = z.array(leagueEntrySchema);

// MATCH-V5: lista ID meczów
export const matchIdsSchema = z.array(z.string());

// MATCH-V5: szczegóły meczu (tylko potrzebne pola)
// Wybór runy: każdy styl ma listę zaznaczonych runic.
const perkStyleSchema = z.object({
  description: z.string(), // "primaryStyle" | "subStyle"
  style: z.number(),
  selections: z.array(z.object({ perk: z.number() })),
});

export const participantSchema = z.object({
  puuid: z.string(),
  teamId: z.number(),
  championId: z.number(),
  championName: z.string(),
  champLevel: z.number(),
  win: z.boolean(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  totalMinionsKilled: z.number(),
  neutralMinionsKilled: z.number(),
  totalDamageDealtToChampions: z.number(),
  goldEarned: z.number(),
  visionScore: z.number(),
  // Pozycja na mapie: TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY (bywa pusta).
  teamPosition: z.string().nullish(),
  // Nick (Riot ID) — w starszych meczach bywa pusty, stąd nullish.
  riotIdGameName: z.string().nullish(),
  riotIdTagline: z.string().nullish(),
  // Czary przywoływacza.
  summoner1Id: z.number(),
  summoner2Id: z.number(),
  // Przedmioty (7 slotów; 0 = pusty).
  item0: z.number(),
  item1: z.number(),
  item2: z.number(),
  item3: z.number(),
  item4: z.number(),
  item5: z.number(),
  item6: z.number(),
  // Runy.
  perks: z.object({ styles: z.array(perkStyleSchema) }),
});

export const matchSchema = z.object({
  metadata: z.object({ matchId: z.string() }),
  info: z.object({
    gameCreation: z.number(),
    gameDuration: z.number(),
    queueId: z.number(),
    participants: z.array(participantSchema),
  }),
});
export type Match = z.infer<typeof matchSchema>;
export type Participant = z.infer<typeof participantSchema>;

// SPECTATOR-V5: aktualna gra (tylko potrzebne pola).
export const activeGameSchema = z.object({
  gameId: z.number(),
  gameLength: z.number(), // sekundy od startu (może być ujemne w fazie ładowania)
  gameMode: z.string(),
  gameQueueConfigId: z.number().optional(),
  participants: z.array(
    z.object({
      puuid: z.string(),
      teamId: z.number(),
      championId: z.number(),
      spell1Id: z.number(),
      spell2Id: z.number(),
      riotId: z.string().nullish(),
      perks: z
        .object({
          perkIds: z.array(z.number()),
          perkStyle: z.number(),
          perkSubStyle: z.number(),
        })
        .nullish(),
    }),
  ),
});
export type ActiveGame = z.infer<typeof activeGameSchema>;
