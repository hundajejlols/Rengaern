"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Comment {
  id: number;
  author: string;
  body: string;
  likes: number;
  created_at: number;
}

async function fetchComments(): Promise<Comment[]> {
  const res = await fetch("/api/comments");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return (await res.json()).comments;
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function CommentsSection() {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments"],
    queryFn: fetchComments,
  });

  // Które komentarze polajkowała ta przeglądarka (żeby móc cofnąć i nie dublować).
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("liked-comments") ?? "[]");
      setLikedIds(new Set(stored as number[]));
    } catch {
      /* ignore */
    }
  }, []);

  const likeMutation = useMutation({
    mutationFn: async ({ id, delta }: { id: number; delta: number }) => {
      const res = await fetch(`/api/comments/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      return { id, likes: (await res.json()).likes as number };
    },
    onSuccess: ({ id, likes }) => {
      queryClient.setQueryData<Comment[]>(["comments"], (old) =>
        old?.map((c) => (c.id === id ? { ...c, likes } : c)),
      );
    },
  });

  function toggleLike(id: number) {
    const liked = likedIds.has(id);
    const next = new Set(likedIds);
    if (liked) next.delete(id);
    else next.add(id);
    setLikedIds(next);
    localStorage.setItem("liked-comments", JSON.stringify([...next]));
    likeMutation.mutate({ id, delta: liked ? -1 : 1 });
  }

  // Formularz pokazujemy dopiero po kliknięciu "Add comment".
  const [showForm, setShowForm] = useState(false);

  // Limit: jeden komentarz na przeglądarkę. Trzymamy też id własnego komentarza,
  // żeby pokazać przy nim przycisk usuwania (i tylko przy nim).
  const [hasCommented, setHasCommented] = useState(false);
  const [myCommentId, setMyCommentId] = useState<number | null>(null);
  useEffect(() => {
    setHasCommented(localStorage.getItem("comment-posted") === "1");
    const stored = localStorage.getItem("comment-id");
    setMyCommentId(stored ? Number(stored) : null);
  }, []);

  // Nick zapamiętujemy, żeby nie wpisywać go za każdym razem.
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const authorLoaded = useRef(false);
  useEffect(() => {
    if (!authorLoaded.current) {
      setAuthor(localStorage.getItem("comment-author") ?? "");
      authorLoaded.current = true;
    }
  }, []);

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, body }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Error ${res.status}`);
      }
      return (await res.json()).comment as Comment;
    },
    onSuccess: (comment) => {
      localStorage.setItem("comment-author", author.trim());
      localStorage.setItem("comment-posted", "1");
      localStorage.setItem("comment-id", String(comment.id));
      setHasCommented(true);
      setMyCommentId(comment.id);
      setBody("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
    },
    onSuccess: () => {
      localStorage.removeItem("comment-posted");
      localStorage.removeItem("comment-id");
      setHasCommented(false);
      setMyCommentId(null);
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim()) addMutation.mutate();
  }

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-xl font-bold text-gold-400">
          Comments &amp; cheers
        </h2>
      </div>

      {hasCommented ? (
        <div className="mb-4 rounded-xl border border-navy-700 bg-navy-900/60 px-4 py-3 text-center text-sm text-gold-300/50">
          You&apos;ve already left a comment — thanks! ✌️
        </div>
      ) : (
        !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-navy-700 bg-navy-900/60 px-4 py-3 text-sm font-medium text-gold-300/80 transition hover:border-gold-500/40 hover:text-gold-300"
          >
            <span className="text-lg leading-none">＋</span>
            Add comment
          </button>
        )
      )}

      {showForm && !hasCommented && (
      <form
        onSubmit={submit}
        className="mb-4 rounded-xl border border-navy-700 bg-navy-900 p-4"
      >
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={40}
          className="mb-2 w-full rounded-lg bg-navy-800 px-3 py-2 text-sm text-gold-200 outline-none ring-1 ring-navy-700 placeholder:text-gold-300/30 focus:ring-gold-500/40"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Drop a comment for the squad before the game…"
          maxLength={500}
          rows={3}
          className="w-full resize-none rounded-lg bg-navy-800 px-3 py-2 text-sm text-gold-200 outline-none ring-1 ring-navy-700 placeholder:text-gold-300/30 focus:ring-gold-500/40"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gold-300/30">{body.length}/500</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gold-300/60 transition hover:text-gold-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!body.trim() || addMutation.isPending}
              className="rounded-lg bg-gold-400/15 px-4 py-1.5 text-sm font-medium text-gold-400 ring-1 ring-gold-400/40 transition hover:bg-gold-400/25 disabled:opacity-40"
            >
              {addMutation.isPending ? "Sending…" : "Post"}
            </button>
          </div>
        </div>
        {addMutation.isError && (
          <p className="mt-2 text-xs text-red-400">
            {(addMutation.error as Error).message}
          </p>
        )}
      </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gold-300/60">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gold-300/50">
          No comments yet — be the first to cheer them on.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-navy-700 bg-navy-900 px-4 py-3"
            >
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gold-300">
                  {c.author}
                </span>
                <span className="text-[11px] text-gold-300/40">
                  {timeAgo(c.created_at)}
                </span>
                {c.id === myCommentId && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(c.id)}
                    disabled={deleteMutation.isPending}
                    className="ml-auto text-[11px] font-medium text-red-400/70 transition hover:text-red-400 disabled:opacity-40"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-gold-200/90">
                {c.body}
              </p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => toggleLike(c.id)}
                  disabled={likeMutation.isPending}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition disabled:opacity-50 " +
                    (likedIds.has(c.id)
                      ? "bg-red-500/20 text-red-300 ring-red-500/40"
                      : "bg-navy-800 text-gold-300/70 ring-navy-700 hover:bg-navy-700")
                  }
                >
                  <span className="leading-none">
                    {likedIds.has(c.id) ? "❤️" : "🤍"}
                  </span>
                  <span className="tabular-nums">{c.likes}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
