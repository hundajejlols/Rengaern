// Księga gości: komentarze sojuszników + globalny licznik lajków strony.
// Wszystko po stronie serwera (libSQL), wołane z API routes.
import { db, dbReady } from "./index";

export interface Comment {
  id: number;
  author: string;
  body: string;
  likes: number;
  created_at: number;
}

const MAX_AUTHOR = 40;
const MAX_BODY = 500;

/** Dodaje komentarz (po przycięciu i walidacji długości). Zwraca nowy rekord. */
export async function addComment(
  author: string,
  body: string,
): Promise<Comment> {
  await dbReady;
  const cleanAuthor = author.trim().slice(0, MAX_AUTHOR) || "Anonim";
  const cleanBody = body.trim().slice(0, MAX_BODY);
  if (!cleanBody) throw new Error("Empty comment");

  const createdAt = Date.now();
  const res = await db.execute({
    sql: `INSERT INTO comments (author, body, created_at)
          VALUES (?, ?, ?)`,
    args: [cleanAuthor, cleanBody, createdAt],
  });
  return {
    id: Number(res.lastInsertRowid),
    author: cleanAuthor,
    body: cleanBody,
    likes: 0,
    created_at: createdAt,
  };
}

/** Ostatnie komentarze (najnowsze pierwsze). */
export async function getComments(limit = 100): Promise<Comment[]> {
  await dbReady;
  const res = await db.execute({
    sql: `SELECT id, author, body, likes, created_at
            FROM comments
           ORDER BY created_at DESC
           LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => ({
    id: Number(r.id),
    author: r.author as string,
    body: r.body as string,
    likes: Number(r.likes ?? 0),
    created_at: Number(r.created_at),
  }));
}

/** Zmienia liczbę lajków komentarza o delta (+1 / -1) i zwraca nową wartość. */
export async function changeCommentLikes(
  id: number,
  delta: number,
): Promise<number> {
  await dbReady;
  const step = delta >= 0 ? 1 : -1;
  await db.execute({
    sql: `UPDATE comments SET likes = MAX(0, likes + ?) WHERE id = ?`,
    args: [step, id],
  });
  const res = await db.execute({
    sql: `SELECT likes FROM comments WHERE id = ?`,
    args: [id],
  });
  return Number(res.rows[0]?.likes ?? 0);
}

/** Usuwa komentarz po id. */
export async function deleteComment(id: number): Promise<void> {
  await dbReady;
  await db.execute({
    sql: `DELETE FROM comments WHERE id = ?`,
    args: [id],
  });
}
