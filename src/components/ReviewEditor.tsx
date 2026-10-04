"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import StarRating from "@/components/StarRating";

interface ReviewEditorProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
}

const REVIEW_COMMENT_PREFIX = "__TTT_REVIEW__:";

export default function ReviewEditor({ tmdbId, mediaType }: ReviewEditorProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadReview() {
      const db = getSupabase();

      const { data: ratingData } = await db.from("user_ratings")
        .select("rating_value, review_text")
        .eq("user_id", user!.id)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType)
        .maybeSingle();

      if (ratingData?.rating_value) {
        const numericRating = Number(ratingData.rating_value);
        if (!Number.isNaN(numericRating)) {
          setRating(numericRating);
        }
      }

      const hasReview = !!(ratingData?.rating_value || ratingData?.review_text);

      if (ratingData?.review_text) {
        setComment(ratingData.review_text);
      }
      setIsEditing(!hasReview);
      setLoading(false);
    }

    loadReview().catch((err) => {
      console.error("Failed to load user review", err);
      setLoading(false);
    });
  }, [user, tmdbId, mediaType]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSuccess(null);

    const db = getSupabase();

    try {
      const reviewText = comment.trim() || null;
      const { data: existingRating } = await db.from("user_ratings")
        .select("id")
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType)
        .maybeSingle();

      const ratingPayload: any = {
        user_id: user.id,
        tmdb_id: tmdbId,
        media_type: mediaType,
        rating_value: rating > 0 ? String(rating) : null,
        review_text: reviewText,
      };

      if (existingRating?.id) {
        const { error: ratingError } = await db.from("user_ratings")
          .update(ratingPayload)
          .eq("id", existingRating.id);

        if (ratingError) {
          throw ratingError;
        }
      } else if (rating > 0 || reviewText) {
        const { error: ratingError } = await db.from("user_ratings").insert(ratingPayload);

        if (ratingError) {
          throw ratingError;
        }
      }

      setSuccess("Your review has been saved.");
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save review", err);
      setSuccess("Unable to save review.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-card-surface p-6 rounded-xl">
        <p className="text-text-muted">
          <Link href={`/signup?next=${encodeURIComponent(pathname)}`} className="text-accent-yellow font-semibold hover:underline">
            Sign up free
          </Link>{" "}
          to rate and review this title.
        </p>
      </div>
    );
  }

  const hasReview = rating > 0 || comment.trim().length > 0;
  const roundedRating = Math.round(rating * 2) / 2;

  return (
    <div className="bg-card-surface p-6 rounded-xl">
      {!isEditing && hasReview ? (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Your Review</h3>
              <p className="text-sm text-text-muted mt-1">You can edit your rating and review anytime.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-text-primary hover:bg-white/10"
            >
              Edit Review
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {rating > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-accent-yellow text-2xl">
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index} className={index + 1 <= Math.floor(rating) ? "" : index + 0.5 === roundedRating ? "opacity-90" : "text-text-muted"}>
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-lg font-bold text-accent-yellow">{rating.toFixed(1)} <span className="text-sm text-text-muted">/ 5</span></span>
              </div>
            )}

            {comment && (
              <div className="rounded-2xl border border-white/10 bg-bg-primary/30 p-4">
                <p className="text-text-primary leading-relaxed">{comment}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Rating</label>
            <StarRating rating={rating} onChange={setRating} />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold">Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Share your thoughts..."
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-text-primary resize-none"
            />
          </div>

          <div className="mt-2 text-sm text-text-muted">You can change your ratings and reviews anytime.</div>
        </div>
      )}

      {(isEditing || !hasReview) && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-text-muted">Your saved review will appear here.</div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-full bg-accent-yellow px-5 py-2.5 font-bold text-bg-primary hover:brightness-110 disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Review"}
          </button>
        </div>
      )}

      {success ? <p className="mt-3 text-sm text-text-muted">{success}</p> : null}
    </div>
  );
}
