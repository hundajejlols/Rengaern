"use client";

import { useQuery } from "@tanstack/react-query";
import type { MatchHistoryResponse, MatchSummary } from "@/lib/types";
import { benchmarkKda, getBenchmark } from "@/config/benchmarks";

async function fetchMatches(
  puuid: string,
  championId: number,
): Promise<MatchHistoryResponse> {
  const res = await fetch(
    `/api/player/${puuid}/matches?champion=${championId}&count=20`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  return res.json();
}

function avg(matches: MatchSummary[], pick: (m: MatchSummary) => number): number {
  if (matches.length === 0) return 0;
  return matches.reduce((s, m) => s + pick(m), 0) / matches.length;
}

export function PlayerAverages({
  puuid,
  championId,
  championName,
  tier,
}: {
  puuid: string;
  championId: number;
  championName: string;
  tier?: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["matches", puuid, championId],
    queryFn: () => fetchMatches(puuid, championId),
    enabled: Boolean(puuid),
  });

  if (isLoading)
    return (
      <div className="rounded-xl border border-navy-700 bg-navy-900 p-5 text-sm text-gold-300/60">
        Calculating averages…
      </div>
    );
  if (isError || !data) return null;

  const m = data.matches;
  if (m.length === 0)
    return (
      <div className="rounded-xl border border-navy-700 bg-navy-900 p-5 text-sm text-gold-300/50">
        No matches — averages will appear after the first games on {championName}.
      </div>
    );

  const games = m.length;
  const wins = m.filter((x) => x.win).length;
  const winrate = Math.round((wins / games) * 100);

  const avgK = avg(m, (x) => x.kills);
  const avgD = avg(m, (x) => x.deaths);
  const avgA = avg(m, (x) => x.assists);
  const avgKda =
    avgD > 0 ? (avgK + avgA) / avgD : avgK + avgA; // perfect KDA when 0 deaths

  const stats: { label: string; value: string }[] = [
    { label: "Avg KDA", value: avgKda.toFixed(2) },
    {
      label: "Avg K / D / A",
      value: `${avgK.toFixed(1)} / ${avgD.toFixed(1)} / ${avgA.toFixed(1)}`,
    },
    { label: "Avg CS", value: avg(m, (x) => x.cs).toFixed(0) },
    { label: "Avg CS/min", value: avg(m, (x) => x.csPerMin).toFixed(1) },
    {
      label: "Avg DMG",
      value: Math.round(avg(m, (x) => x.damageToChampions)).toLocaleString(
        "en-US",
      ),
    },
    { label: "Avg vision", value: avg(m, (x) => x.visionScore).toFixed(0) },
    {
      label: "Avg gold",
      value: Math.round(avg(m, (x) => x.goldEarned)).toLocaleString("en-US"),
    },
    { label: "Avg AI Score", value: avg(m, (x) => x.aiScore).toFixed(1) },
  ];

  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-gold-300">
          Average stats per match
        </h2>
        <span className="text-xs text-gold-300/40">
          {games} games · {winrate}% winrate
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg bg-navy-800/60 px-3 py-2.5 text-center"
          >
            <dt className="text-[11px] uppercase tracking-wide text-gold-300/50">
              {s.label}
            </dt>
            <dd className="mt-0.5 text-base font-semibold text-gold-300">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <Comparison
        championId={championId}
        tier={tier}
        my={{
          kda: avgKda,
          cs: avg(m, (x) => x.cs),
          damage: avg(m, (x) => x.damageToChampions),
          gold: avg(m, (x) => x.goldEarned),
          deaths: avgD,
        }}
      />
    </div>
  );
}

interface MyStats {
  kda: number;
  cs: number;
  damage: number;
  gold: number;
  deaths: number;
}

function Comparison({
  championId,
  tier,
  my,
}: {
  championId: number;
  tier?: string;
  my: MyStats;
}) {
  const b = getBenchmark(championId, tier);
  if (!b) return null;

  // higherBetter=false for deaths (fewer = better).
  const rows: {
    label: string;
    mine: number;
    base: number;
    higherBetter: boolean;
    fmt: (n: number) => string;
  }[] = [
    { label: "KDA", mine: my.kda, base: benchmarkKda(b), higherBetter: true, fmt: (n) => n.toFixed(2) },
    { label: "CS", mine: my.cs, base: b.cs, higherBetter: true, fmt: (n) => n.toFixed(0) },
    { label: "DMG", mine: my.damage, base: b.damage, higherBetter: true, fmt: (n) => Math.round(n).toLocaleString("en-US") },
    { label: "Gold", mine: my.gold, base: b.gold, higherBetter: true, fmt: (n) => Math.round(n).toLocaleString("en-US") },
    { label: "Deaths", mine: my.deaths, base: b.deaths, higherBetter: false, fmt: (n) => n.toFixed(1) },
  ];

  return (
    <div className="mt-5 border-t border-navy-700 pt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gold-300">
          Comparison to {b.championName} players ({b.lane}, {b.bracket})
        </h3>
        <span className="text-[11px] text-gold-300/40">
          source: {b.source} · {b.capturedAt}
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const diffPct =
            r.base > 0 ? Math.round(((r.mine - r.base) / r.base) * 100) : 0;
          const better = r.higherBetter ? r.mine >= r.base : r.mine <= r.base;
          return (
            <div key={r.label} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 text-gold-300/60">{r.label}</span>
              <span className="w-20 shrink-0 text-right font-semibold text-gold-300">
                {r.fmt(r.mine)}
              </span>
              <span className="text-gold-300/30">vs</span>
              <span className="w-24 shrink-0 text-gold-300/50">
                {r.fmt(r.base)}
              </span>
              <span
                className={
                  "ml-auto rounded px-2 py-0.5 text-xs font-semibold " +
                  (better
                    ? "bg-emerald-400/15 text-emerald-400"
                    : "bg-red-400/15 text-red-400")
                }
              >
                {diffPct > 0 ? "+" : ""}
                {diffPct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
