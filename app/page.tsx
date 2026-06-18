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
    throw new Error(body.error ?? `Error ${res.status}`);
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
            One player = one champion. Everything in one place.
          </p>
        </div>
        <RefreshButton />
      </header>

      {isLoading && <p className="text-gold-300/70">Loading…</p>}

      {isError && (
        <div className="rounded-lg border border-red-700 bg-red-950/40 p-4 text-red-300">
          Error: {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          {/* One shared "Live game" section — they play together. */}
          {puuids.length > 0 && <LiveGame puuids={puuids} />}

          {/* Stats separately — two columns side by side. */}
          <div className="grid gap-6 lg:grid-cols-2">
            {data.players.map((player) => (
              <PlayerSection key={player.id} player={player} />
            ))}
          </div>

          {/* Shared match history — one row per game, stats for both players. */}
          <div className="mt-10">
            <h2 className="mb-3 text-xl font-bold text-gold-400">
              Shared match history
            </h2>
            <CombinedMatchHistory players={data.players} />
          </div>
        </>
      )}
    </main>
  );
}
