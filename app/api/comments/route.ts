// GET /api/comments — lista komentarzy z księgi gości.
// POST /api/comments — dodaj komentarz { author, body }.
import { NextResponse } from "next/server";
import { addComment, getComments } from "@/lib/db/comments";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const comments = await getComments();
    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const author = typeof body.author === "string" ? body.author : "";
    const text = typeof body.body === "string" ? body.body : "";
    if (!text.trim()) {
      return NextResponse.json(
        { error: "Comment cannot be empty." },
        { status: 400 },
      );
    }
    const comment = await addComment(author, text);
    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
