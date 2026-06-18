"use client";

import { useState } from "react";

// Rank timeline: from the challenge start (Silver IV) to the goal (Master).
// The marker position is computed from the current rank read from Riot API.

const TIERS = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
] as const;

const DIV: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

// Linear rank value. For tiers with divisions: IV=0 .. I=3.
function rankValue(tier: string, rank: string): number {
  const t = TIERS.indexOf(tier.toUpperCase() as (typeof TIERS)[number]);
  const idx = t < 0 ? 2 : t; // fallback: SILVER
  const apex = idx >= TIERS.indexOf("MASTER");
  const divPart = apex ? 0 : 4 - (DIV[rank.toUpperCase()] ?? 4);
  return idx * 4 + divPart;
}

const START = rankValue("SILVER", "IV"); // 8
const GOAL = rankValue("MASTER", "I"); // 28

// Intermediate nodes — evenly spaced every 20%.
const MILESTONES = [
  { label: "Silver IV", short: "S4", tier: "SILVER", rank: "IV" },
  { label: "Gold IV", short: "G4", tier: "GOLD", rank: "IV" },
  { label: "Platinum IV", short: "P4", tier: "PLATINUM", rank: "IV" },
  { label: "Emerald IV", short: "E4", tier: "EMERALD", rank: "IV" },
  { label: "Diamond IV", short: "D4", tier: "DIAMOND", rank: "IV" },
  { label: "Master", short: "M", tier: "MASTER", rank: "I" },
];

function pct(value: number): number {
  return Math.max(0, Math.min(1, (value - START) / (GOAL - START))) * 100;
}

const TIER_COLOR: Record<string, string> = {
  SILVER: "#9fb0c3",
  GOLD: "#e0b04a",
  PLATINUM: "#4ec3b0",
  EMERALD: "#3fbf6f",
  DIAMOND: "#5aa9ff",
  MASTER: "#b969e9",
  GRANDMASTER: "#e0524a",
  CHALLENGER: "#f0e6d2",
};

export function RankTimeline({
  tier,
  rank,
  leaguePoints,
}: {
  tier?: string;
  rank?: string;
  leaguePoints?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const hasRank = Boolean(tier && rank);
  const current = hasRank ? rankValue(tier!, rank!) : START;
  const currentPct = pct(current);
  const reachedGoal = current >= GOAL;

  const currentColor =
    (tier && TIER_COLOR[tier.toUpperCase()]) ?? TIER_COLOR.SILVER;

  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900 px-6 pb-10 pt-8">
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-wide text-gold-300/50">
        <span>Start: Silver IV</span>
        <span>Goal: Master</span>
      </div>

      <div className="relative mx-2 h-1.5 rounded-full bg-navy-700">
        {/* progress bar */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{
            width: `${currentPct}%`,
            background: `linear-gradient(90deg, #9fb0c3, ${currentColor})`,
          }}
        />

        {/* milestone nodes */}
        {MILESTONES.map((m, i) => {
          const p = pct(rankValue(m.tier, m.rank));
          const reached = current >= rankValue(m.tier, m.rank);
          return (
            <button
              key={m.label}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
              style={{ left: `${p}%`, top: "50%" }}
            >
              <span
                className={
                  "block h-3.5 w-3.5 rounded-full border-2 transition " +
                  (reached
                    ? "border-gold-400 bg-gold-400"
                    : "border-navy-700 bg-navy-800 hover:border-gold-500")
                }
                style={
                  reached
                    ? { backgroundColor: TIER_COLOR[m.tier], borderColor: TIER_COLOR[m.tier] }
                    : undefined
                }
              />
              <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap text-[10px] text-gold-300/50">
                {m.short}
              </span>
              {hover === i && (
                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-navy-700 px-2 py-1 text-xs text-gold-300 shadow-lg">
                  {m.label}
                </span>
              )}
            </button>
          );
        })}

        {/* current rank marker */}
        {hasRank && (
          <div
            className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
            style={{ left: `${currentPct}%` }}
          >
            <span
              className="block h-5 w-5 animate-pulse rounded-full ring-4 ring-navy-900"
              style={{ backgroundColor: currentColor }}
            />
            <span
              className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold shadow-lg"
              style={{ backgroundColor: currentColor, color: "#0a0e1a" }}
            >
              {reachedGoal
                ? "MASTER 🎉"
                : `${tier} ${rank} · ${leaguePoints ?? 0} LP`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
