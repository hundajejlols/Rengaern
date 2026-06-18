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
  // Lokalny plik SQLite blokuje się przy współbieżnych zapisach (dashboard robi
  // ich dużo naraz). WAL + busy_timeout sprawiają, że zapisy czekają zamiast
  // rzucać SQLITE_BUSY. Na Turso (libsql://) pomijamy — serwer ogarnia to sam.
  if (url.startsWith("file:")) {
    await db.execute("PRAGMA journal_mode = WAL");
    await db.execute("PRAGMA busy_timeout = 8000");
  }
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
      `CREATE TABLE IF NOT EXISTS rank_cache (
         puuid         TEXT PRIMARY KEY,
         has_rank      INTEGER NOT NULL,
         tier          TEXT,
         rank          TEXT,
         league_points INTEGER,
         wins          INTEGER,
         losses        INTEGER,
         updated_at    INTEGER NOT NULL
       )`,
      // Księga gości: komentarze sojuszników przed meczem (z lajkami per komentarz).
      `CREATE TABLE IF NOT EXISTS comments (
         id         INTEGER PRIMARY KEY AUTOINCREMENT,
         author     TEXT NOT NULL,
         body       TEXT NOT NULL,
         likes      INTEGER NOT NULL DEFAULT 0,
         created_at INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_comments_created
         ON comments(created_at)`,
    ],
    "write",
  );

  // Migracja: dodaj kolumnę likes do istniejących baz (gdy tabela już była).
  try {
    await db.execute("ALTER TABLE comments ADD COLUMN likes INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* kolumna już istnieje */
  }
}

/** Każde zapytanie do bazy musi najpierw zaczekać na ten promise. */
export const dbReady: Promise<void> =
  globalForDb.__dbReady ?? initSchema();
globalForDb.__dbReady = dbReady;
