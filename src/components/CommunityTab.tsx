"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const REACTIONS = [
  { id: "like", label: "Like", emoji: "👍" },
  { id: "love", label: "Love", emoji: "❤️" },
  { id: "funny", label: "Funny", emoji: "😂" },
  { id: "downvote", label: "Downvote", emoji: "👎" },
];

interface CommentItem {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  comment_text: string;
  created_at: string;
  username?: string;
  reaction_counts?: Record<string, number>;
  my_reaction?: string;
}

interface CommunityTabProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
}

export default function CommunityTab({ tmdbId, mediaType }: CommunityTabProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadComments() {
      const supabase = getSupabase();
      let query = supabase
        .from("user_comments")
        .select(`*`)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType)
        .order("created_at", { ascending: false })
        .limit(20)
        .not("comment_text", "like", "__TTT_REVIEW__:%");

      const { data, error } = await query;

      if (error) {
        console.error("Failed to load community comments", error);
        setComments([]);
      } else {
        const displayName = user?.user_metadata?.display_name || "Anonymous";
        const rows = (data || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          tmdb_id: item.tmdb_id,
          media_type: item.media_type,
          comment_text: item.comment_text,
          created_at: item.created_at,
          username: item.user_id === user?.id ? displayName : "Anonymous",
          reaction_counts: item.reaction_counts || {},
          my_reaction: item.my_reaction,
        }));
        setComments(rows);
      }
      setLoading(false);
    }
    loadComments();
  }, [tmdbId, mediaType]);

  const handlePostComment = async () => {
    if (!user || !newComment.trim()) return;
    setSaving(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.from("user_comments").insert([
      {
        user_id: user.id,
        tmdb_id: tmdbId,
        media_type: mediaType,
        comment_text: newComment.trim(),
      },
    ]).select(`*`);

    if (error) {
      console.error("Failed to post comment", error);
      setSaving(false);
      return;
    }

    setNewComment("");
    if (data && data[0]) {
      const displayName = user?.user_metadata?.display_name || "Anonymous";
      setComments((prev) => [
        {
          id: data[0].id,
          user_id: data[0].user_id,
          tmdb_id: data[0].tmdb_id,
          media_type: data[0].media_type,
          comment_text: data[0].comment_text,
          created_at: data[0].created_at,
          username: displayName,
          reaction_counts: {},
        },
        ...prev,
      ]);
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="bg-card-surface p-6 rounded-xl">
        <p className="text-text-muted">Sign in to join the community and post comments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card-surface p-6 rounded-xl">
        <h3 className="text-lg font-bold mb-3">Join the discussion</h3>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={4}
          placeholder="What did you think of this title?"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-text-primary resize-none"
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handlePostComment}
            disabled={saving || !newComment.trim()}
            className="rounded-full bg-accent-yellow px-5 py-2.5 font-bold text-bg-primary hover:brightness-110 disabled:opacity-70"
          >
            {saving ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-6 text-text-muted text-center">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="p-6 text-text-muted text-center">No comments yet. Be the first to post.</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-card-surface p-4 rounded-3xl border border-white/10">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-text-primary">{comment.username}</p>
                  <p className="text-xs text-text-muted">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  {REACTIONS.map((reaction) => (
                    <span key={reaction.id}>{reaction.emoji}</span>
                  ))}
                </div>
              </div>
              <p className="text-text-primary leading-relaxed">{comment.comment_text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
