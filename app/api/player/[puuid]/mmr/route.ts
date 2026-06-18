// GET /api/player/[puuid]/mmr — szacowane MMR ze średniej rangi lobby
// (ostatnie 3 mecze, bez Rengara i Iverna).
import { NextResponse } from "next/server";
import { estimateMmr } from "@/lib/mmr";
import { isAllowedPuuid } from "@/lib/players";
import { RiotApiError } from "@/lib/riot/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ puuid: string }> },
) {
  if (!process.env.RIOT_API_KEY) {
    return NextResponse.json(
      { error: "Brak RIOT_API_KEY. Ustaw klucz w pliku .env." },
      { status: 500 },
    );
  }

  const { puuid } = await params;
  if (!(await isAllowedPuuid(puuid))) {
    return NextResponse.json(
      { error: "Nieautoryzowany gracz." },
      { status: 403 },
    );
  }
  try {
    const estimate = await estimateMmr(puuid, 3);
    return NextResponse.json(estimate);
  } catch (err) {
    const status = err instanceof RiotApiError ? err.status : 500;
    const message =
      err instanceof RiotApiError ? `Riot API ${err.status}` : "Server error";
    return NextResponse.json({ error: message }, { status });
  }
}
