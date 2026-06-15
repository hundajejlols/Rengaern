"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLAYERS } from "@/config/players";
import { RefreshButton } from "./RefreshButton";

// Pasek nawigacji: przełączanie między graczami (Rengar / Ivern).
// Lista bierze się z config/players.ts — dopisanie gracza = nowy przycisk.
// Tu też w przyszłości dojdą kolejne przyciski (np. statystyki, leaderboard).
export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 border-b border-navy-700 pb-4">
      <Link
        href="/"
        className="rounded-lg px-3 py-1.5 text-sm text-gold-300/60 transition hover:bg-navy-800 hover:text-gold-300"
      >
        Menu
      </Link>
      {PLAYERS.map((p) => {
        const href = `/player/${p.id}`;
        const active = pathname === href;
        return (
          <Link
            key={p.id}
            href={href}
            className={
              "rounded-lg px-3 py-1.5 text-sm font-medium transition " +
              (active
                ? "bg-gold-500/20 text-gold-300 ring-1 ring-gold-500/50"
                : "text-gold-300/60 hover:bg-navy-800 hover:text-gold-300")
            }
          >
            {p.championName}
          </Link>
        );
      })}
      <RefreshButton />
    </nav>
  );
}
