// Baza danych przez libSQL (@libsql/client).
// - Lokalnie: plik `file:./data/tracker.db` (nie wymaga konta Turso).
// - Produkcja (Vercel): Turso przez TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
// Serverless nie ma trwałego dysku, dlatego w chmurze używamy Turso.
// Cała komunikacja z bazą jest asynchroniczna i wyłącznie po stronie serwera.
import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";

// Pusty string w .env też ma uruchomić fallback na plik lokalny (stąd `||`).
const url = process.env.TURSO_DATABASE_URL?.trim() || "file:./data/tracker.db";
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;

// Dla lokalnego pliku upewniamy się, że katalog istnieje.
if (url.startsWith("file:")) {
  try {
    mkdirSync("data", { recursive: true });
  } catch {
    /* katalog już istnieje */
  }
}

// Jedna instancja klienta + jednorazowa inicjalizacja schematu na proces.
const globalForDb = globalThis as unknown as {
  __dbClient?: Client;
  __dbReady?: Promise<void>;
};

export const db: Client =
  globalForDb.__dbClient ?? createClient({ url, authToken });
globalForDb.__dbClient = db;

async function initSchema(): Promise<void> {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS match_cache (
         match_id   TEXT PRIMARY KEY,
         data       TEXT NOT NULL,
         created_at INTEGER NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS rank_snapshots (
         id            INTEGER PRIMARY KEY AUTOINCREMENT,
         puuid         TEXT NOT NULL,
         queue         TEXT NOT NULL,
         tier          TEXT,
         rank          TEXT,
         league_points INTEGER,
         wins          INTEGER,
         losses        INTEGER,
         created_at    INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_snapshots_puuid
         ON rank_snapshots(puuid, queue, created_at)`,
    ],
    "write",
  );
}

/** Każde zapytanie do bazy musi najpierw zaczekać na ten promise. */
export const dbReady: Promise<void> =
  globalForDb.__dbReady ?? initSchema();
globalForDb.__dbReady = dbReady;
