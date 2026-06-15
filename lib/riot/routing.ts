// Routing Riot API dla EUW.
// KRYTYCZNE: EUW używa dwóch różnych hostów zależnie od endpointu.
//  - platform (euw1)  -> SUMMONER-V4, LEAGUE-V4, CHAMPION-MASTERY-V4
//  - regional (europe) -> ACCOUNT-V1, MATCH-V5

export const PLATFORM_HOST = "https://euw1.api.riotgames.com";
export const REGIONAL_HOST = "https://europe.api.riotgames.com";

export type RiotHost = typeof PLATFORM_HOST | typeof REGIONAL_HOST;
