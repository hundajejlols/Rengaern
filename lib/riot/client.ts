// Centralny klient HTTP do Riot API.
// - throttling: ogranicza liczbę równoczesnych zapytań i odstęp między nimi,
//   żeby zmieścić się w limitach dev key (~20 req/s, 100 req / 2 min),
// - obsługa 429: czyta Retry-After i ponawia z backoffem,
// - wszystko działa WYŁĄCZNIE po stronie serwera (klucz z process.env).

import { z } from "zod";
import type { RiotHost } from "./routing";

const RIOT_API_KEY = process.env.RIOT_API_KEY;

export class RiotApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "RiotApiError";
  }
}

// Pula o ograniczonej równoległości — do MAX_CONCURRENT zapytań naraz.
// Zamiast serializować wszystko (co było wolne przy MMR / wielu meczach),
// puszczamy je równolegle, ale z limitem, żeby zmieścić się w ~20 req/s dev key.
const MAX_CONCURRENT = 8;
let active = 0;
const queue: (() => void)[] = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => queue.push(resolve));
}

function release(): void {
  active--;
  const next = queue.shift();
  if (next) {
    active++;
    next();
  }
}

async function schedule<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const MAX_RETRIES = 3;

interface RequestOptions {
  /** Czy 404 ma zwrócić null zamiast rzucać błędem (np. brak ranked entries). */
  allow404?: boolean;
}

async function rawRequest(
  host: RiotHost,
  path: string,
  attempt = 0,
): Promise<Response> {
  if (!RIOT_API_KEY) {
    throw new RiotApiError(
      500,
      "Brak RIOT_API_KEY w środowisku. Ustaw klucz w .env.",
    );
  }

  const res = await schedule(() =>
    fetch(`${host}${path}`, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
      cache: "no-store",
    }),
  );

  if (res.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = Number(res.headers.get("Retry-After")) || 1;
    const backoff = retryAfter * 1000 * (attempt + 1);
    await sleep(backoff);
    return rawRequest(host, path, attempt + 1);
  }

  // Sporadyczne 5xx też ponawiamy z krótkim backoffem.
  if (res.status >= 500 && res.status < 600 && attempt < MAX_RETRIES) {
    await sleep(500 * (attempt + 1));
    return rawRequest(host, path, attempt + 1);
  }

  return res;
}

/**
 * Wykonuje zapytanie do Riot API i waliduje odpowiedź podanym schematem zod.
 */
export async function riotGet<T>(
  host: RiotHost,
  path: string,
  schema: z.ZodType<T>,
  opts: RequestOptions = {},
): Promise<T> {
  const res = await rawRequest(host, path);

  if (res.status === 404 && opts.allow404) {
    return schema.parse(undefined as unknown);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new RiotApiError(
      res.status,
      `Riot API ${res.status} dla ${path}: ${body.slice(0, 200)}`,
    );
  }

  const json = await res.json();
  return schema.parse(json);
}
