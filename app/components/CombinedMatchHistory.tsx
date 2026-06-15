"use client";

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type {
  MatchHistoryResponse,
  MatchSummary,
  PlayerRankData,
} from "@/lib/types";
import { MatchDetail } from "./MatchDetail";

async function fetchMatches(
  puuid: string,
  championId: number,
): Promise<MatchHistoryResponse> {
  const res = await fetch(
    `/api/player/${puuid}/matches?champion=${championId}&count=20`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Błąd ${res.status}`);
  }
  return res.json();
}

function timeAgo(ms: number): string {
  const h = Math.floor((Date.now() - ms) / 3_600_000);
  if (h < 1) return "przed chwilą";
  if (h < 24) return `${h} godz. temu`;
  return `${Math.floor(h / 24)} dni temu`;
}

function fmtDuration(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function scoreClass(score: number): string {
  if (score >= 8) return "bg-amber-400/20 text-amber-300";
  if (score >= 6.5) return "bg-sky-400/20 text-sky-300";
  if (score >= 5) return "bg-emerald-400/15 text-emerald-300";
  if (score >= 3.5) return "bg-navy-700 text-gold-300/70";
  return "bg-red-500/20 text-red-300";
}

const POS: Record<string, string> = {
  TOP: "top",
  JUNGLE: "jungle",
  MIDDLE: "middle",
  BOTTOM: "bottom",
  UTILITY: "utility",
};

interface MergedRow {
  matchId: string;
  gameCreation: number;
  gameDuration: number;
  win: boolean;
  perPlayer: Record<string, MatchSummary>;
}

export function CombinedMatchHistory({
  players,
}: {
  players: PlayerRankData[];
}) {
  const results = useQueries({
    queries: players.map((p) => ({
      queryKey: ["matches", p.puuid, p.championId],
      queryFn: () => fetchMatches(p.puuid, p.championId),
      enabled: Boolean(p.puuid),
    })),
  });
  const [open, setOpen] = useState<string | null>(null);

  const loading = results.some((r) => r.isLoading);
  const allPuuids = players.filter((p) => p.puuid).map((p) => p.puuid);

  // Scalamy mecze obu graczy po matchId (grają razem -> ten sam mecz).
  const byId = new Map<string, MergedRow>();
  results.forEach((r, i) => {
    const player = players[i];
    for (const m of r.data?.matches ?? []) {
      const row =
        byId.get(m.matchId) ??
        ({
          matchId: m.matchId,
          gameCreation: m.gameCreation,
          gameDuration: m.gameDuration,
          win: m.win,
          perPlayer: {},
        } as MergedRow);
      row.perPlayer[player.id] = m;
      byId.set(m.matchId, row);
    }
  });
  const rows = [...byId.values()].sort(
    (a, b) => b.gameCreation - a.gameCreation,
  );

  if (loading)
    return <p className="text-sm text-gold-300/60">Ładowanie meczów…</p>;
  if (rows.length === 0)
    return (
      <p className="text-sm text-gold-300/50">
        Brak meczów od startu challenge'u.
      </p>
    );

  return (
    <div>
      <p className="mb-2 text-xs text-gold-300/50">
        Wspólna historia ({rows.length} gier). Kliknij grę, by zobaczyć pełny
        skład.
      </p>
      <div className="space-y-2">
        {rows.map((row) => {
          const isOpen = open === row.matchId;
          return (
            <div
              key={row.matchId}
              className={
                "overflow-hidden rounded-lg border " +
                (row.win
                  ? "border-sky-500/30 bg-sky-500/5"
                  : "border-red-500/30 bg-red-500/5")
              }
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : row.matchId)}
                className={
                  "flex w-full items-stretch gap-2 border-l-4 text-left transition hover:bg-navy-800/40 " +
                  (row.win ? "border-l-sky-500" : "border-l-red-500")
                }
              >
                {/* Wspólny wynik gry */}
                <div className="flex w-24 shrink-0 flex-col justify-center px-3 py-2">
                  <span
                    className={
                      "text-sm font-semibold " +
                      (row.win ? "text-sky-400" : "text-red-400")
                    }
                  >
                    {row.win ? "Wygrana" : "Przegrana"}
                  </span>
                  <span className="text-[11px] text-gold-300/40">
                    {fmtDuration(row.gameDuration)} · {timeAgo(row.gameCreation)}
                  </span>
                </div>

                {/* Blok każdego gracza osobno */}
                <div className="grid flex-1 grid-cols-2 divide-x divide-navy-700/60">
                  {players.map((p) => (
                    <PlayerCell key={p.id} m={row.perPlayer[p.id]} />
                  ))}
                </div>

                <span className="flex items-center px-2 text-gold-300/40">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <MatchDetail
                  matchId={row.matchId}
                  highlightPuuids={allPuuids}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayerCell({ m }: { m?: MatchSummary }) {
  if (!m)
    return (
      <div className="flex items-center px-3 py-2 text-xs text-gold-300/30">
        nie grał
      </div>
    );
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={m.championIconUrl}
        alt={m.championName}
        className="h-9 w-9 rounded-full ring-1 ring-navy-700"
      />
      <div
        className={
          "rounded px-1.5 py-0.5 text-sm font-bold " + scoreClass(m.aiScore)
        }
      >
        {m.aiScore.toFixed(1)}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-sm text-gold-300">
          <span className="font-semibold">
            {m.kills}/{m.deaths}/{m.assists}
          </span>
          {POS[m.position] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-${POS[m.position]}.png`}
              alt={m.position}
              className="h-4 w-4 opacity-70 [filter:brightness(0)_invert(0.85)]"
            />
          )}
        </div>
        <div className="text-[11px] text-gold-300/50">
          {m.kda} KDA · {m.cs} CS
          {m.lpChange != null && (
            <span
              className={
                m.lpChange > 0
                  ? " text-emerald-400"
                  : m.lpChange < 0
                    ? " text-red-400"
                    : ""
              }
            >
              {" · "}
              {m.lpChange > 0 ? "+" : ""}
              {m.lpChange} LP
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
