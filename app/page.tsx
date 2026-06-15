"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { PlayersResponse } from "@/lib/types";

async function fetchPlayers(): Promise<PlayersResponse> {
  const res = await fetch("/api/players");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Błąd ${res.status}`);
  }
  return res.json();
}

export default function MenuPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-gold-400">
          Ivern &amp; Rengar Challenge
        </h1>
        <p className="mt-2 text-sm text-gold-300/70">
          Jeden gracz = jeden champion. Wybierz, kogo sprawdzasz.
        </p>
      </header>

      {isLoading && (
        <p className="text-center text-gold-300/70">Ładowanie…</p>
      )}

      {isError && (
        <div className="rounded-lg border border-red-700 bg-red-950/40 p-4 text-center text-red-300">
          Błąd: {(error as Error).message}
        </div>
      )}

      {data && (
        <div className="grid gap-6 sm:grid-cols-2">
          {data.players.map((p) => (
            <Link
              key={p.id}
              href={`/player/${p.id}`}
              className="group flex flex-col items-center gap-4 rounded-2xl border border-navy-700 bg-navy-900 p-8 transition hover:border-gold-500/70 hover:bg-navy-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.championIconUrl}
                alt={p.championName}
                className="h-24 w-24 rounded-xl ring-2 ring-gold-500/40 transition group-hover:ring-gold-400"
              />
              <div className="text-center">
                <div className="text-xl font-bold text-gold-300">
                  {p.championName}
                </div>
                <div className="text-sm text-gold-300/60">{p.displayName}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
