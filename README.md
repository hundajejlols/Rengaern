# Ivern & Rengar Challenge Tracker

Tracker challenge'u w League of Legends: dwóch graczy gra **wyłącznie** przypisanym
championem (Rengar / Ivern). Aplikacja pokazuje rangę, winrate liczony od startu
challenge'u, historię meczów w stylu op.gg, własny **AI Score** per mecz, dominację
na lane, szacowane MMR z lobby oraz snapshoty LP w czasie.

Stack: **Next.js (App Router) + TypeScript**, Tailwind CSS, TanStack Query,
Recharts, **libSQL/Turso** (snapshoty + cache meczów), zod.

---

## Bezpieczeństwo (najważniejsze)

- **Klucz Riota nigdy nie trafia do przeglądarki.** Wszystkie zapytania do Riot API
  idą przez backend (API routes). Frontend uderza tylko do własnego `/api`.
- Klucz trzymany w zmiennej środowiskowej `RIOT_API_KEY` (lokalnie `.env`,
  w chmurze w panelu Vercel). `.env` jest w `.gitignore` i **nie** trafia do repo.
- Endpointy `/api/player/...` i `/api/match/...` są ograniczone allowlistą PUUID-ów
  skonfigurowanych graczy — publiczny deploy **nie** może być użyty jako darmowe
  proxy do naszego klucza.
- Nagłówki bezpieczeństwa (HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy) ustawione globalnie w `next.config.ts`.

> ⚠️ Development key z Riota **wygasa co 24h**. Po wygaśnięciu zaktualizuj
> `RIOT_API_KEY` (lokalnie w `.env` + restart `npm run dev`; na Vercel w panelu
> + redeploy). Do działania na stałe złóż wniosek o personal/production key.

---

## Uruchomienie lokalne

1. Zainstaluj zależności:
   ```bash
   npm install
   ```
2. Skonfiguruj środowisko:
   ```bash
   cp .env.example .env
   ```
   Wklej do `.env` swój klucz: `RIOT_API_KEY=RGAPI-...`
   (pobierz z https://developer.riotgames.com → Development API Key).
   Zmienne `TURSO_*` zostaw **puste** — lokalnie użyty zostanie plik
   `data/tracker.db`.
3. Odpal serwer deweloperski:
   ```bash
   npm run dev
   ```
   Aplikacja: http://localhost:3000

---

## Konfiguracja graczy i challenge'u

Wszystko w `config/players.ts`:

- `PLAYERS` — lista graczy (Riot ID, champion, championId). Dodanie kolejnego
  gracza = nowy wpis; reszta aplikacji (menu, podstrony, MMR) działa generycznie.
- `CHALLENGE_START` — data/godzina startu challenge'u. Liczą się tylko mecze
  rozegrane od tego momentu (stare gry na innych postaciach są ignorowane).

---

## Deploy na Vercel + Turso

### 1. Baza danych (Turso)
Serverless nie ma trwałego dysku, więc snapshoty i cache trzymamy w Turso (libSQL):

```bash
# zainstaluj CLI Turso (https://docs.turso.tech), zaloguj się, potem:
turso db create rengar-ivern
turso db show rengar-ivern --url            # -> TURSO_DATABASE_URL
turso db tokens create rengar-ivern         # -> TURSO_AUTH_TOKEN
```

### 2. Repozytorium
Wypchnij projekt na GitHub (klucz i `.env` nie pójdą — są w `.gitignore`).

### 3. Vercel
1. https://vercel.com → **New Project** → zaimportuj repo z GitHuba.
2. **Environment Variables** ustaw:
   - `RIOT_API_KEY` = `RGAPI-...`
   - `TURSO_DATABASE_URL` = `libsql://...turso.io`
   - `TURSO_AUTH_TOKEN` = token z kroku 1
3. **Deploy.** Każdy push na GitHub = automatyczny redeploy.

> ❌ GitHub Pages **nie zadziała** — serwuje tylko pliki statyczne, nie ma
> backendu ani sekretów, więc klucz Riota zostałby ujawniony. Dlatego hostujemy
> na Vercel (kod może dalej leżeć na GitHubie).

---

## Skróty

| Komenda | Działanie |
|---------|-----------|
| `npm run dev` | serwer deweloperski |
| `npm run build` | build produkcyjny |
| `npm run start` | uruchomienie buildu |
# Rengaern
