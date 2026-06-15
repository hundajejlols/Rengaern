"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LiveGameResponse, LiveParticipant } from "@/lib/types";

async function fetchLive(puuid: string): Promise<LiveGameResponse> {
  const res = await fetch(`/api/player/${puuid}/live`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Błąd ${res.status}`);
  }
  return res.json();
}

const QUEUE_NAMES: Record<number, string> = {
  420: "Ranked SoloQ",
  440: "Ranked Flex",
  400: "Normal Draft",
  430: "Normal Blind",
  450: "ARAM",
  490: "Quickplay",
};

const POSITION_ICON: Record<string, string> = {
  TOP: "top",
  JUNGLE: "jungle",
  MIDDLE: "middle",
  BOTTOM: "bottom",
  UTILITY: "utility",
};

function RoleIcon({ position }: { position: string }) {
  const icon = POSITION_ICON[position];
  if (!icon) return <span className="w-4 shrink-0" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-${icon}.png`}
      alt={position}
      className="h-4 w-4 shrink-0 opacity-70 [filter:brightness(0)_invert(0.85)]"
    />
  );
}

function fmtLength(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function LiveGame({ puuids }: { puuids: string[] }) {
  const [open, setOpen] = useState(false);
  // Gracze grają razem, więc sprawdzamy obu i pokazujemy grę raz (pierwszą żywą).
  const { data } = useQuery({
    queryKey: ["live", ...puuids],
    queryFn: async (): Promise<LiveGameResponse> => {
      for (const p of puuids) {
        const game = await fetchLive(p);
        if (game.inGame) return game;
      }
      return { inGame: false, gameLength: 0, gameMode: "", queueId: null, teams: [] };
    },
    enabled: puuids.length > 0,
    refetchInterval: 60_000, // odświeżaj co minutę, gdy w grze
  });

  // Nie pokazujemy nic, dopóki nie wiemy albo gdy gracz nie jest w grze.
  if (!data || !data.inGame) return null;

  const queue =
    (data.queueId && QUEUE_NAMES[data.queueId]) || data.gameMode || "Gra";

  return (
    <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <h2 className="text-lg font-semibold text-emerald-400">
          Aktualna gra — na żywo
        </h2>
        <span className="ml-auto text-sm text-gold-300/60">
          {queue} · {fmtLength(data.gameLength)}
        </span>
        <span className="text-gold-300/40">{open ? "▲" : "▼"}</span>
      </button>

      {!open && (
        <p className="mt-2 text-xs text-gold-300/40">
          Kliknij, by zobaczyć skład.
        </p>
      )}

      {open && (
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {data.teams.map((team) => (
          <div key={team.teamId}>
            <div
              className={
                "mb-1 text-xs font-semibold uppercase " +
                (team.teamId === 100 ? "text-sky-400" : "text-red-400")
              }
            >
              {team.teamId === 100 ? "Niebiescy" : "Czerwoni"}
            </div>
            <div className="space-y-1">
              {team.players.map((p) => (
                <PlayerRow key={p.puuid} p={p} />
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function PlayerRow({ p }: { p: LiveParticipant }) {
  return (
    <div
      className={
        "flex items-center gap-2 rounded-md px-2 py-1.5 " +
        (p.isTracked ? "bg-gold-400/10 ring-1 ring-gold-400/30" : "bg-navy-800/40")
      }
    >
      <RoleIcon position={p.position} />
      {p.championIconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.championIconUrl}
          alt={p.championName}
          className="h-8 w-8 rounded"
        />
      ) : (
        <span className="h-8 w-8 rounded bg-navy-700" />
      )}
      <div className="flex flex-col gap-0.5">
        {p.summonerSpellIcons.map((s, i) =>
          s ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={s} alt="" className="h-3.5 w-3.5 rounded" />
          ) : (
            <span key={i} className="h-3.5 w-3.5 rounded bg-navy-700" />
          ),
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        {p.keystoneIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.keystoneIcon}
            alt=""
            className="h-3.5 w-3.5 rounded-full bg-navy-900"
          />
        ) : (
          <span className="h-3.5 w-3.5 rounded-full bg-navy-700" />
        )}
        {p.subStyleIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.subStyleIcon} alt="" className="h-3.5 w-3.5" />
        ) : (
          <span className="h-3.5 w-3.5 rounded-full bg-navy-700" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={
            "truncate text-sm " +
            (p.isTracked ? "font-semibold text-gold-300" : "text-gold-300/80")
          }
          title={p.riotId}
        >
          {p.riotId}
        </div>
        <div className="text-[11px] text-gold-300/50">
          {p.championName}
          {p.rank ? ` · ${p.rank}` : ""}
        </div>
      </div>
    </div>
  );
}
