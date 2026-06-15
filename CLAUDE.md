# CLAUDE.md — Ivern & Rengar Challenge Tracker

Kontekst projektu dla Claude Code. Czytaj to przed każdą większą zmianą.

## Cel projektu

Aplikacja webowa, która śledzi postęp dwóch graczy w "challenge" w League of Legends:
gra się **wyłącznie** jednym, przypisanym do siebie championem. Aplikacja pokazuje
ranking, statystyki, compliance z challengem (czy ktoś nie "zdradził" i nie zagrał
innej postacią) oraz historyczny progres LP w czasie.

## Gracze (konfiguracja w `config/players.ts`)

| Gracz | Riot ID | Champion | Champion ID |
|-------|---------|----------|-------------|
| Kaijinzerd | `Kaijinzerd#EUW` | Rengar | `107` |
| P3henomenal | `P3henomenal#EUW` | Ivern | `427` |

Serwer: **EUW**. Trzymaj graczy w jednej, łatwo edytowalnej tablicy konfiguracyjnej,
żeby dało się dodać kolejnych ludzi bez grzebania w kodzie.

## Riot API — najważniejsze zasady

### Routing (KRYTYCZNE — częsty błąd)
EUW używa dwóch różnych hostów zależnie od endpointu:
- **Platform routing** (`euw1`) — SUMMONER-V4, LEAGUE-V4, CHAMPION-MASTERY-V4
  - host: `https://euw1.api.riotgames.com`
- **Regional routing** (`europe`) — ACCOUNT-V1, MATCH-V5
  - host: `https://europe.api.riotgames.com`

### Kluczowe endpointy
1. **Riot ID → PUUID** (ACCOUNT-V1, regional `europe`):
   `GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`
   (np. gameName=`Kaijinzerd`, tagLine=`EUW`)
2. **PUUID → ranked** (LEAGUE-V4, platform `euw1`):
   `GET /lol/league/v4/entries/by-puuid/{puuid}`
   Zwraca tier / rank / LP / wins / losses dla SoloQ i Flex.
3. **Lista meczów** (MATCH-V5, regional `europe`):
   `GET /lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count=20&queue=420`
   (queue 420 = ranked SoloQ; 440 = Flex). Zwraca tablicę matchId.
4. **Szczegóły meczu** (MATCH-V5, regional `europe`):
   `GET /lol/match/v5/matches/{matchId}`
   W `info.participants[]` znajdź uczestnika po `puuid` → masz `championId`,
   `championName`, `win`, `kills/deaths/assists`, `totalMinionsKilled`,
   `neutralMinionsKilled` (CS = totalMinionsKilled + neutralMinionsKilled),
   `totalDamageDealtToChampions`, `goldEarned`, `visionScore`, `gameDuration`.

### Klucz API
- Klucz trzymany WYŁĄCZNIE w `.env` jako `RIOT_API_KEY`.
- Klucz NIGDY nie trafia do klienta. Wszystkie zapytania do Riot API idą przez
  backend (API routes / server actions). Frontend uderza tylko do własnego API.
- W repo jest `.env.example` z `RIOT_API_KEY=` (puste). `.env` jest w `.gitignore`.
- Dodawaj nagłówek: `X-Riot-Token: <klucz>`.

### Rate limiting (dev key)
- Dev key: ~20 req/s i 100 req / 2 min. Łatwo to przekroczyć przy pobieraniu
  wielu meczów. Wymagane:
  - centralny klient HTTP do Riota z kolejkowaniem / throttlingiem,
  - obsługa kodu `429` z odczytem nagłówka `Retry-After` i retry z backoffem,
  - cache odpowiedzi (szczegóły meczu są niezmienne — cache'uj je na stałe).

### Champion assets (Data Dragon)
- Ikony championów / itemów bierz z Data Dragon (publiczne, bez klucza):
  - splash/ikona: `https://ddragon.leagueoflegends.com/cdn/<wersja>/img/champion/Rengar.png`
  - aktualną wersję pobierz z `https://ddragon.leagueoflegends.com/api/versions.json` (pierwszy element).

## Historia LP (WAŻNE)

Riot API **nie** udostępnia historii LP/rankingu w czasie. Żeby pokazać wykres
progresu, aplikacja musi sama **snapshotować** stan rankingu:
- przy każdym odświeżeniu danych zapisuj do bazy rekord:
  `{ puuid, queue, tier, rank, leaguePoints, wins, losses, timestamp }`,
- wykres LP/winrate w czasie buduj z tych snapshotów,
- nie duplikuj snapshotu, jeśli nic się nie zmieniło od ostatniego (porównaj
  wins/losses/LP).

Baza: SQLite (np. `better-sqlite3` lub Prisma). Trzymaj też cache meczów,
żeby nie odpytywać Riota w kółko.

## Logika "compliance" z challengem

Dla każdego gracza, dla pobranych meczów:
- mecz jest **zgodny**, jeśli grany champion = przypisany champion (po `championId`),
- mecz **niezgodny** ("zdrada") = inny champion → oznacz na czerwono,
- licz `complianceRate = zgodne / wszystkie`,
- pokaż licznik "zdrad" jako element rywalizacji / wstydu.

## Stack technologiczny

- **Next.js (App Router) + TypeScript** — jeden projekt, API routes chowają klucz.
- **Tailwind CSS** do stylowania, ciemny motyw w klimacie LoL.
- **TanStack Query** do fetchowania i cache'owania po stronie klienta.
- **Recharts** do wykresów (LP w czasie, winrate, KDA).
- **SQLite** (`better-sqlite3` lub Prisma) do snapshotów i cache meczów.
- **zod** do walidacji odpowiedzi z Riot API.

## Konwencje kodu

- Cała komunikacja z Riotem w `lib/riot/` (osobny moduł: klient z throttlingiem,
  funkcje na endpointy, typy z zod).
- Sekrety tylko po stronie serwera. Żadnych `NEXT_PUBLIC_` dla klucza.
- Komponenty UI małe i reużywalne. Karty graczy, tabela meczów, wykresy jako
  osobne komponenty.
- Obsługuj stany: loading, error (w tym 429), brak danych.
- Komentarze i UI mogą być po polsku.

## Definicja "gotowe" dla MVP

1. Dashboard z kartą każdego gracza: nick, ranga, LP, winrate, compliance %.
2. Tabela ostatnich meczów z KDA, CS, championem i oznaczeniem zgodności.
3. Wykres LP w czasie (z snapshotów).
4. Leaderboard: kto wygrywa challenge (sortowanie po randze/LP + compliance).
5. Przycisk "Odśwież", który pobiera świeże dane i zapisuje snapshot.
6. Klucz w `.env`, `.env.example` w repo, działający `README.md` z instrukcją.
