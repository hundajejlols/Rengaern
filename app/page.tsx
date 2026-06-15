"use client";

import { useQuery } from "@tanstack/react-query";
import type { PlayersResponse } from "@/lib/types";
import { LiveGame } from "./components/LiveGame";
import { PlayerSection } from "./components/PlayerSection";
import { CombinedMatchHistory } from "./components/CombinedMatchHistory";
import { RefreshButton } from "./components/RefreshButton";

async function fetchPlayers(): Promise<PlayersResponse> {
  const res = await fetch("/api/players");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Błąd ${res.status}`);
  }
  return res.json();
}

export default function HomePage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });

  const puuids =
    data?.players.filter((p) => p.puuid && !p.error).map((p) => p.puuid) ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-bold text-gold-400">
            Ivern &amp; Rengar Challenge
          </h1>
          <p className="text-sm text-gold-300/60">
            Jeden gracz = jeden champion. Wszystko w jednym miejscu.
          </p>
        </div>
        <RefreshButton />
      </header>

      {isLoading && <p className="text-gold-300/70">Ładowanie…</p>}

      {isError && (
        <div className="rounded-lg border border-red-700 bg-red-950/40 p-4 text-red-300">
          Błąd: {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          {/* Jedna wspólna sekcja „Aktualna gra" — grają razem. */}
          {puuids.length > 0 && <LiveGame puuids={puuids} />}

          {/* Statystyki osobno — dwie kolumny obok siebie. */}
          <div className="grid gap-6 lg:grid-cols-2">
            {data.players.map((player) => (
              <PlayerSection key={player.id} player={player} />
            ))}
          </div>

          {/* Wspólna historia meczów — jeden wiersz na grę, staty obu graczy. */}
          <div className="mt-10">
            <h2 className="mb-3 text-xl font-bold text-gold-400">
              Wspólna historia meczów
            </h2>
            <CombinedMatchHistory players={data.players} />
          </div>
        </>
      )}
    </main>
  );
}
