"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { track } from "@/lib/analytics";

const REACTIONS = [
  { id: "like", label: "Like", emoji: "👍" },
  { id: "love", label: "Love", emoji: "❤️" },
  { id: "funny", label: "Funny", emoji: "😂" },
  { id: "downvote", label: "Downvote", emoji: "👎" },
] as const;

const MAX_COMMENT = 2000;

interface CommentItem {
  id: string | number;
  user_id: string;
  comment_text: string;
  created_at: string;
  is_spoiler: boolean;
  username: string;
  reaction_counts: Record<string, number>;
  my_reaction?: string;
}

interface CommunityTabProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
}

export default function CommunityTab({ tmdbId, mediaType }: CommunityTabProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<Set<string | number>>(new Set());
  const [myName, setMyName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const userId = user?.id;

  const loadComments = useCallback(async () => {
    const db = getSupabase();
    const { data, error: loadError } = await db
      .from("user_comments")
      .select("*")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .not("comment_text", "like", "__TTT_REVIEW__:%")
      .order("created_at", { ascending: false })
      .limit(30);

    if (loadError || !data) {
      console.error("Failed to load community comments", loadError);
      setComments([]);
      setLoading(false);
      return;
    }

    const ids = data.map((c: any) => c.id);
    const authorIds = Array.from(new Set(data.map((c: any) => c.user_id)));

    const [{ data: profiles }, { data: reactions }] = await Promise.all([
      authorIds.length
        ? db.from("profiles").select("id, display_name").in("id", authorIds)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? db.from("comment_reactions").select("comment_id, user_id, reaction").in("comment_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const names = new Map<string, string>();
    (profiles || []).forEach((p: any) => p.display_name && names.set(p.id, p.display_name));

    setComments(
      data.map((c: any) => {
        const counts: Record<string, number> = {};
        let mine: string | undefined;
        (reactions || [])
          .filter((r: any) => r.comment_id === c.id)
          .forEach((r: any) => {
            counts[r.reaction] = (counts[r.reaction] || 0) + 1;
            if (r.user_id === userId) mine = r.reaction;
          });
        return {
          id: c.id,
          user_id: c.user_id,
          comment_text: c.comment_text,
          created_at: c.created_at,
          is_spoiler: !!c.is_spoiler,
          username: names.get(c.user_id) || "Anonymous viewer",
          reaction_counts: counts,
          my_reaction: mine,
        };
      })
    );
    setLoading(false);
  }, [tmdbId, mediaType, userId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!userId) return;
    getSupabase()
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setMyName(data?.display_name || user?.user_metadata?.display_name || ""));
  }, [userId, user?.user_metadata?.display_name]);

  const saveName = async () => {
    const name = nameDraft.trim().slice(0, 40);
    if (!name || !userId) return;
    await getSupabase().from("profiles").upsert({ id: userId, display_name: name, updated_at: new Date().toISOString() });
    await getSupabase().auth.updateUser({ data: { display_name: name } });
    setMyName(name);
  };

  const handlePostComment = async () => {
    const text = newComment.trim().slice(0, MAX_COMMENT);
    if (!userId || !text) return;
    setSaving(true);
    setError("");
    const { error: postError } = await getSupabase().from("user_comments").insert({
      user_id: userId,
      tmdb_id: tmdbId,
      media_type: mediaType,
      comment_text: text,
      is_spoiler: isSpoiler,
    });
    setSaving(false);
    if (postError) {
      console.error("Failed to post comment", postError);
      setError("Couldn't post your comment. Please try again.");
      return;
    }
    track("comment_posted", { media_type: mediaType, spoiler: isSpoiler });
    setNewComment("");
    setIsSpoiler(false);
    loadComments();
  };

  const handleReact = async (comment: CommentItem, reaction: string) => {
    if (!userId) return;
    const db = getSupabase();
    const removing = comment.my_reaction === reaction;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== comment.id) return c;
        const counts = { ...c.reaction_counts };
        if (c.my_reaction) counts[c.my_reaction] = Math.max(0, (counts[c.my_reaction] || 1) - 1);
        if (!removing) counts[reaction] = (counts[reaction] || 0) + 1;
        return { ...c, reaction_counts: counts, my_reaction: removing ? undefined : reaction };
      })
    );
    if (removing) {
      await db.from("comment_reactions").delete().eq("comment_id", comment.id).eq("user_id", userId);
    } else {
      await db
        .from("comment_reactions")
        .upsert({ comment_id: comment.id, user_id: userId, reaction }, { onConflict: "comment_id,user_id" });
    }
  };

  const handleDelete = async (comment: CommentItem) => {
    if (!userId || !window.confirm("Delete this comment?")) return;
    const { error: delError } = await getSupabase().from("user_comments").delete().eq("id", comment.id).eq("user_id", userId);
    if (!delError) setComments((prev) => prev.filter((c) => c.id !== comment.id));
  };

  const handleReport = async (comment: CommentItem) => {
    if (!userId) return;
    const reason = window.prompt("Why are you reporting this comment? (spam, abuse, spoiler without tag…)");
    if (reason === null) return;
    await getSupabase()
      .from("comment_reports")
      .upsert({ comment_id: comment.id, user_id: userId, reason: reason.slice(0, 500) }, { onConflict: "comment_id,user_id" });
    window.alert("Thanks — we'll take a look.");
  };

  return (
    <div className="space-y-6">
      {!user ? (
        <div className="bg-card-surface p-6 rounded-xl">
          <p className="text-text-muted">
            <Link href={`/signup?next=${encodeURIComponent(pathname)}`} className="text-accent-yellow font-semibold hover:underline">
              Create a free account
            </Link>{" "}
            to join the discussion.
          </p>
        </div>
      ) : myName === "" ? (
        <div className="bg-card-surface p-6 rounded-xl space-y-3">
          <h3 className="text-lg font-bold">Pick a display name</h3>
          <p className="text-sm text-text-muted">This is how other viewers will see you. Your email is never shown.</p>
          <div className="flex gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={40}
              placeholder="e.g. BingeQueen"
              className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            />
            <button onClick={saveName} className="rounded-full bg-accent-yellow px-4 py-2 font-bold text-bg-primary">
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card-surface p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-3">Join the discussion</h3>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            maxLength={MAX_COMMENT}
            placeholder="What did you think of this title?"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-text-primary resize-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input type="checkbox" checked={isSpoiler} onChange={(e) => setIsSpoiler(e.target.checked)} />
              Contains spoilers
            </label>
            <button
              onClick={handlePostComment}
              disabled={saving || !newComment.trim()}
              className="rounded-full bg-accent-yellow px-5 py-2.5 font-bold text-bg-primary hover:brightness-110 disabled:opacity-70"
            >
              {saving ? "Posting..." : "Post Comment"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="p-6 text-text-muted text-center">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="p-6 text-text-muted text-center">No comments yet. Be the first to post.</div>
        ) : (
          comments.map((comment) => {
            const hidden = comment.is_spoiler && !revealed.has(comment.id) && comment.user_id !== userId;
            return (
              <div key={comment.id} className="bg-card-surface p-4 rounded-3xl border border-white/10">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-text-primary">
                      {comment.username}
                      {comment.user_id === userId && <span className="ml-2 text-xs text-text-muted">(you)</span>}
                    </p>
                    <p className="text-xs text-text-muted">{new Date(comment.created_at).toLocaleString()}</p>
                  </div>
                  {userId && (
                    <button
                      onClick={() => (comment.user_id === userId ? handleDelete(comment) : handleReport(comment))}
                      className="text-xs text-text-muted hover:text-red-400"
                    >
                      {comment.user_id === userId ? "Delete" : "Report"}
                    </button>
                  )}
                </div>

                {hidden ? (
                  <button
                    onClick={() => setRevealed((prev) => new Set(prev).add(comment.id))}
                    className="w-full rounded-2xl bg-black/30 border border-dashed border-white/10 px-4 py-3 text-sm text-text-muted hover:text-white"
                  >
                    ⚠️ Spoiler — tap to reveal
                  </button>
                ) : (
                  <p className="text-text-primary leading-relaxed whitespace-pre-wrap break-words">{comment.comment_text}</p>
                )}

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {REACTIONS.map((reaction) => {
                    const count = comment.reaction_counts[reaction.id] || 0;
                    const mine = comment.my_reaction === reaction.id;
                    return (
                      <button
                        key={reaction.id}
                        onClick={() => handleReact(comment, reaction.id)}
                        disabled={!userId}
                        title={reaction.label}
                        className={`rounded-full px-3 py-1 text-xs border transition-colors disabled:cursor-default ${
                          mine ? "border-accent-yellow bg-accent-yellow/10 text-text-primary" : "border-white/10 text-text-muted hover:bg-white/5"
                        }`}
                      >
                        {reaction.emoji} {count > 0 ? count : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
