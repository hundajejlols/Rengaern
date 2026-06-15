"use client";

import { useQuery } from "@tanstack/react-query";
import type { MatchHistoryResponse, MatchSummary } from "@/lib/types";

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

// Wyciąga mecz o maksymalnej/minimalnej wartości danej metryki.
function pick(
  matches: MatchSummary[],
  metric: (m: MatchSummary) => number,
  mode: "max" | "min",
): MatchSummary {
  return matches.reduce((best, m) => {
    const v = metric(m);
    const b = metric(best);
    return mode === "max" ? (v > b ? m : best) : v < b ? m : best;
  });
}

function kdaLine(m: MatchSummary): string {
  return `${m.kills}/${m.deaths}/${m.assists}`;
}

export function PlayerRecords({
  puuid,
  championId,
}: {
  puuid: string;
  championId: number;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["matches", puuid, championId],
    queryFn: () => fetchMatches(puuid, championId),
    enabled: Boolean(puuid),
  });

  if (isLoading)
    return (
      <div className="rounded-xl border border-navy-700 bg-navy-900 p-4 text-sm text-gold-300/60">
        Liczenie rekordów…
      </div>
    );

  if (isError || !data) return null;

  const matches = data.matches;
  if (matches.length === 0)
    return (
      <div className="rounded-xl border border-navy-700 bg-navy-900 p-4 text-sm text-gold-300/50">
        Brak meczów — rekordy pojawią się po pierwszych grach.
      </div>
    );

  const bestKda = pick(matches, (m) => m.kda, "max");
  const mostKills = pick(matches, (m) => m.kills, "max");
  const bestCs = pick(matches, (m) => m.csPerMin, "max");
  const mostDmg = pick(matches, (m) => m.damageToChampions, "max");
  const mostVision = pick(matches, (m) => m.visionScore, "max");

  const worstKda = pick(matches, (m) => m.kda, "min");
  const mostDeaths = pick(matches, (m) => m.deaths, "max");
  const worstCs = pick(matches, (m) => m.csPerMin, "min");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase text-emerald-400">
          Najlepsze rekordy
        </h3>
        <dl className="space-y-1.5 text-sm">
          <Rec label="Najlepsze KDA" value={String(bestKda.kda)} sub={kdaLine(bestKda)} />
          <Rec label="Najwięcej zabójstw" value={String(mostKills.kills)} sub={kdaLine(mostKills)} />
          <Rec label="Najlepsze CS/min" value={String(bestCs.csPerMin)} sub={`${bestCs.cs} CS`} />
          <Rec
            label="Najwięcej DMG"
            value={mostDmg.damageToChampions.toLocaleString("pl-PL")}
            sub={kdaLine(mostDmg)}
          />
          <Rec label="Najwięcej wizji" value={String(mostVision.visionScore)} sub={kdaLine(mostVision)} />
        </dl>
      </div>

      <div className="rounded-xl border border-red-800/50 bg-red-950/20 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase text-red-400">
          Najgorsze rekordy
        </h3>
        <dl className="space-y-1.5 text-sm">
          <Rec label="Najgorsze KDA" value={String(worstKda.kda)} sub={kdaLine(worstKda)} />
          <Rec label="Najwięcej śmierci" value={String(mostDeaths.deaths)} sub={kdaLine(mostDeaths)} />
          <Rec label="Najgorsze CS/min" value={String(worstCs.csPerMin)} sub={`${worstCs.cs} CS`} />
        </dl>
      </div>
    </div>
  );
}

function Rec({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-gold-300/60">{label}</dt>
      <dd className="text-right">
        <span className="font-semibold text-gold-300">{value}</span>{" "}
        <span className="text-xs text-gold-300/40">{sub}</span>
      </dd>
    </div>
  );
}
