"use client";

import { useQuery } from "@tanstack/react-query";
import type { MatchDetailPlayer, MatchDetailResponse } from "@/lib/types";

async function fetchMatch(matchId: string): Promise<MatchDetailResponse> {
  const res = await fetch(`/api/match/${matchId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Błąd ${res.status}`);
  }
  return res.json();
}

function scoreClass(score: number): string {
  if (score >= 8) return "bg-amber-400/20 text-amber-300";
  if (score >= 6.5) return "bg-sky-400/20 text-sky-300";
  if (score >= 5) return "bg-emerald-400/15 text-emerald-300";
  if (score >= 3.5) return "bg-navy-700 text-gold-300/70";
  return "bg-red-500/20 text-red-300";
}

export function MatchDetail({
  matchId,
  highlightPuuid,
}: {
  matchId: string;
  highlightPuuid: string;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => fetchMatch(matchId),
  });

  return (
    <div className="border-t border-navy-700 bg-navy-950/60 p-4">
      {isLoading && (
        <p className="py-6 text-center text-gold-300/60">
          Ładowanie składów (i rang 10 graczy)…
        </p>
      )}
      {isError && (
        <p className="py-6 text-center text-red-400">
          Błąd: {(error as Error).message}
        </p>
      )}

      {data && (
        <div className="space-y-4">
          {data.teams.map((team) => (
              <div key={team.teamId}>
                <div
                  className={
                    "mb-1 text-xs font-semibold uppercase " +
                    (team.win ? "text-emerald-400" : "text-red-400")
                  }
                >
                  {team.teamId === 100 ? "Niebiescy" : "Czerwoni"} —{" "}
                  {team.win ? "Wygrana" : "Przegrana"}
                </div>
                <div className="overflow-x-auto rounded-lg border border-navy-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-navy-800 text-gold-300/50">
                      <tr>
                        <th className="px-2 py-1.5">Gracz</th>
                        <th className="px-2 py-1.5">Ranga</th>
                        <th className="px-2 py-1.5">Score</th>
                        <th className="px-2 py-1.5">KDA</th>
                        <th className="px-2 py-1.5">DMG</th>
                        <th className="px-2 py-1.5">CS</th>
                        <th className="px-2 py-1.5">Przedmioty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.players.map((p) => (
                        <PlayerRow
                          key={p.puuid}
                          p={p}
                          highlight={p.puuid === highlightPuuid}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function PlayerRow({
  p,
  highlight,
}: {
  p: MatchDetailPlayer;
  highlight: boolean;
}) {
  return (
    <tr
      className={
        "border-t border-navy-700/60 " +
        (highlight ? "bg-gold-500/10" : "odd:bg-navy-900 even:bg-navy-900/40")
      }
    >
      {/* Gracz: postać + lvl + czary + runy + nick */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.championIconUrl}
              alt={p.championName}
              className="h-9 w-9 rounded"
            />
            <span className="absolute -bottom-1 -right-1 rounded bg-navy-950 px-1 text-[9px] font-bold text-gold-300">
              {p.champLevel}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {p.summonerSpellIcons.map((s, i) =>
              s ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={s} alt="spell" className="h-4 w-4 rounded" />
              ) : (
                <span key={i} className="h-4 w-4 rounded bg-navy-700" />
              ),
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {p.keystoneIcon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.keystoneIcon}
                alt="keystone"
                className="h-4 w-4 rounded-full bg-navy-900"
              />
            ) : (
              <span className="h-4 w-4 rounded-full bg-navy-700" />
            )}
            {p.subStyleIcon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.subStyleIcon}
                alt="rune style"
                className="h-4 w-4"
              />
            ) : (
              <span className="h-4 w-4 rounded-full bg-navy-700" />
            )}
          </div>
          <span
            className={
              "max-w-[120px] truncate " +
              (highlight ? "font-semibold text-gold-300" : "text-gold-300/80")
            }
            title={p.riotId}
          >
            {p.riotId}
          </span>
        </div>
      </td>
      <td className="px-2 py-1.5 text-gold-300/60">{p.rank ?? "—"}</td>
      <td className="px-2 py-1.5">
        <span
          className={
            "rounded px-1.5 py-0.5 font-bold " + scoreClass(p.aiScore)
          }
        >
          {p.aiScore.toFixed(1)}
        </span>
      </td>
      <td className="px-2 py-1.5 text-gold-300/80">
        {p.kills}/{p.deaths}/{p.assists}{" "}
        <span className="text-gold-300/40">({p.kda})</span>
      </td>
      <td className="px-2 py-1.5 text-gold-300/80">
        {p.damageToChampions.toLocaleString("pl-PL")}
      </td>
      <td className="px-2 py-1.5 text-gold-300/80">
        {p.cs} <span className="text-gold-300/40">({p.csPerMin})</span>
      </td>
      <td className="px-2 py-1.5">
        <div className="flex gap-0.5">
          {p.itemIcons.map((it, i) =>
            it ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={it} alt="item" className="h-6 w-6 rounded" />
            ) : (
              <span key={i} className="h-6 w-6 rounded bg-navy-800" />
            ),
          )}
        </div>
      </td>
    </tr>
  );
}
