// DELETE /api/comments/[id] — usuwa komentarz. Własność komentarza jest
// pilnowana po stronie klienta (id zapisane w localStorage osoby, która go dodała).
import { NextResponse } from "next/server";
import { deleteComment } from "@/lib/db/comments";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId)) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }
    await deleteComment(numId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
