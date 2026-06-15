"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MatchHistoryResponse } from "@/lib/types";
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
  const diff = Date.now() - ms;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "przed chwilą";
  if (h < 24) return `${h} godz. temu`;
  const d = Math.floor(h / 24);
  return `${d} dni temu`;
}

// Kolor odznaki score'u — wzorowany na skali deeplol (S/A/B/C/D).
function scoreClass(score: number): string {
  if (score >= 8) return "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50";
  if (score >= 6.5) return "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/40";
  if (score >= 5) return "bg-emerald-400/15 text-emerald-300";
  if (score >= 3.5) return "bg-navy-700 text-gold-300/70";
  return "bg-red-500/20 text-red-300";
}

// Ikona i etykieta pozycji (Community Dragon).
const POSITIONS: Record<string, { icon: string; label: string }> = {
  TOP: { icon: "top", label: "Top" },
  JUNGLE: { icon: "jungle", label: "Jungla" },
  MIDDLE: { icon: "middle", label: "Mid" },
  BOTTOM: { icon: "bottom", label: "ADC" },
  UTILITY: { icon: "utility", label: "Support" },
};

function PositionIcon({ position }: { position: string }) {
  const p = POSITIONS[position];
  if (!p) return <span className="text-gold-300/30">—</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-${p.icon}.png`}
      alt={p.label}
      title={p.label}
      className="h-5 w-5 opacity-80 [filter:brightness(0)_invert(0.85)]"
    />
  );
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MatchHistory({
  puuid,
  championId,
  championName,
}: {
  puuid: string;
  championId: number;
  championName: string;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["matches", puuid, championId],
    queryFn: () => fetchMatches(puuid, championId),
    enabled: Boolean(puuid),
  });
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading)
    return <p className="text-sm text-gold-300/60">Ładowanie meczów…</p>;

  if (isError)
    return (
      <p className="text-sm text-red-400">
        Błąd historii meczów: {(error as Error).message}
      </p>
    );

  if (!data) return null;

  if (data.fetched === 0)
    return (
      <p className="text-sm text-gold-300/50">
        Brak gier ranked SoloQ od startu challenge'u.
      </p>
    );

  if (data.matches.length === 0)
    return (
      <p className="text-sm text-gold-300/50">
        Brak meczów na {championName} wśród {data.fetched} gier ranked
        rozegranych od startu challenge'u.
      </p>
    );

  return (
    <div>
      <p className="mb-2 text-xs text-gold-300/50">
        {data.matches.length} z {data.fetched} gier ranked na {championName} od
        startu challenge'u.{" "}
        <span className="text-gold-300/30">
          Kliknij mecz, by zobaczyć pełny skład.
        </span>
      </p>

      <div className="space-y-2">
        {data.matches.map((m) => {
          const open = selected === m.matchId;
          return (
            <div
              key={m.matchId}
              className={
                "overflow-hidden rounded-lg border " +
                (m.win
                  ? "border-sky-500/30 bg-sky-500/5"
                  : "border-red-500/30 bg-red-500/5")
              }
            >
              <button
                type="button"
                onClick={() => setSelected(open ? null : m.matchId)}
                className={
                  "flex w-full items-center gap-3 border-l-4 px-3 py-2.5 text-left transition hover:bg-navy-800/40 " +
                  (m.win ? "border-l-sky-500" : "border-l-red-500")
                }
              >
                {/* Meta: wynik / czas / LP */}
                <div className="w-20 shrink-0">
                  <div
                    className={
                      "text-sm font-semibold " +
                      (m.win ? "text-sky-400" : "text-red-400")
                    }
                  >
                    {m.win ? "Wygrana" : "Przegrana"}
                  </div>
                  <div className="text-[11px] text-gold-300/40">
                    {fmtDuration(m.gameDuration)} · {timeAgo(m.gameCreation)}
                  </div>
                  <div className="mt-0.5 text-[11px]">
                    {m.lpChange == null ? (
                      <span className="text-gold-300/30">— LP</span>
                    ) : (
                      <span
                        className={
                          m.lpChange > 0
                            ? "font-semibold text-emerald-400"
                            : m.lpChange < 0
                              ? "font-semibold text-red-400"
                              : "text-gold-300/50"
                        }
                      >
                        {m.lpChange > 0 ? "+" : ""}
                        {m.lpChange} LP
                      </span>
                    )}
                  </div>
                </div>

                {/* Postać + czary + runy */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.championIconUrl}
                      alt={m.championName}
                      className="h-11 w-11 rounded-full ring-1 ring-navy-700"
                    />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-navy-950 px-1 text-[9px] font-bold text-gold-300">
                      {m.champLevel}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {m.summonerSpellIcons.map((s, i) =>
                      s ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={s} alt="" className="h-5 w-5 rounded" />
                      ) : (
                        <span key={i} className="h-5 w-5 rounded bg-navy-700" />
                      ),
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {m.keystoneIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.keystoneIcon}
                        alt=""
                        className="h-5 w-5 rounded-full bg-navy-900"
                      />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-navy-700" />
                    )}
                    {m.subStyleIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.subStyleIcon} alt="" className="h-5 w-5" />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-navy-700" />
                    )}
                  </div>
                </div>

                {/* KDA + pozycja */}
                <div className="w-28 shrink-0">
                  <div className="text-sm text-gold-300">
                    <span className="font-semibold">
                      {m.kills} / {m.deaths} / {m.assists}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gold-300/50">
                    <span>{m.kda} KDA</span>
                    <PositionIcon position={m.position} />
                  </div>
                </div>

                {/* Statystyki */}
                <div className="hidden w-28 shrink-0 text-[11px] text-gold-300/60 sm:block">
                  <div>CS {m.cs} ({m.csPerMin}/min)</div>
                  <div>{m.damageToChampions.toLocaleString("pl-PL")} dmg</div>
                  <div>Wizja {m.visionScore}</div>
                </div>

                {/* AI Score */}
                <div className="shrink-0 text-center">
                  <div
                    className={
                      "rounded-md px-2 py-1 text-base font-bold " +
                      scoreClass(m.aiScore)
                    }
                  >
                    {m.aiScore.toFixed(1)}
                  </div>
                  <div className="text-[9px] uppercase text-gold-300/30">
                    score
                  </div>
                </div>

                {/* Dominacja nad przeciwnikiem z tej samej roli */}
                {m.laneLabel && m.laneDiff != null && (
                  <div className="hidden w-32 shrink-0 text-center lg:block">
                    <div
                      className={
                        "text-xs font-semibold " +
                        (m.laneDiff >= 1.2
                          ? "text-emerald-400"
                          : m.laneDiff <= -1.2
                            ? "text-red-400"
                            : "text-gold-300/60")
                      }
                    >
                      {m.laneLabel}
                    </div>
                    <div className="text-[10px] text-gold-300/40">
                      {m.laneDiff > 0 ? "+" : ""}
                      {m.laneDiff} score
                      {m.opponentChampion ? ` vs ${m.opponentChampion}` : ""}
                    </div>
                  </div>
                )}

                {/* Itemy */}
                <div className="ml-auto hidden shrink-0 grid-cols-4 gap-0.5 md:grid">
                  {m.itemIcons.map((it, i) =>
                    it ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={it}
                        alt=""
                        className="h-6 w-6 rounded"
                      />
                    ) : (
                      <span key={i} className="h-6 w-6 rounded bg-navy-800/60" />
                    ),
                  )}
                </div>

                <span className="ml-2 shrink-0 text-gold-300/40">
                  {open ? "▲" : "▼"}
                </span>
              </button>

              {open && (
                <MatchDetail matchId={m.matchId} highlightPuuid={puuid} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
