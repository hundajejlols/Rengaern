// POST /api/comments/[id]/like — zmień lajki komentarza { delta: 1 | -1 }.
import { NextResponse } from "next/server";
import { changeCommentLikes } from "@/lib/db/comments";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId)) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const delta = body.delta === -1 ? -1 : 1;
    const likes = await changeCommentLikes(numId, delta);
    return NextResponse.json({ likes });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
