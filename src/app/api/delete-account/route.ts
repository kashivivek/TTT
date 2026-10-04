import { NextRequest, NextResponse } from "next/server";
import { escapeHtml, getAdminClient, getUserFromRequest } from "@/lib/server-auth";

const USER_TABLES = [
  "watch_history",
  "tracked_shows",
  "user_ratings",
  "user_comments",
  "user_emotions",
  "user_favorites",
  "user_badges",
  "user_preferences",
  "comment_reactions",
  "comment_reports",
  "push_subscriptions",
  "notification_preferences",
];

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Invalid or missing session" }, { status: 401 });
    }

    const admin = getAdminClient();
    if (!admin) {
      console.error("Supabase service role key not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 50) : "unspecified";
    const comments = typeof body?.comments === "string" ? body.comments.slice(0, 2000) : "";

    const { error: logError } = await admin.from("account_deletions").insert({
      user_id: user.id,
      user_email: user.email || null,
      reason,
      comments: comments || null,
      created_at: new Date().toISOString(),
    });
    if (logError) console.error("Failed to insert account_deletions record", logError.message);

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || "TV Time Tracker <onboarding@resend.dev>",
            to: process.env.ADMIN_EMAIL || "kashivivek@gmail.com",
            subject: `[TTT Account Deletion] ${reason}`.replace(/[\r\n]/g, " "),
            html: `
              <h2>Account Deletion</h2>
              <p><strong>User ID:</strong> ${escapeHtml(user.id)}</p>
              <p><strong>User Email:</strong> ${escapeHtml(user.email || "Not provided")}</p>
              <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
              <blockquote style="border-left: 4px solid #eee; padding-left: 10px; color: #555;">${escapeHtml(comments).replace(/\n/g, "<br/>")}</blockquote>
            `,
          }),
        });
        if (!res.ok) console.error("Resend email failed", res.status);
      } catch (e) {
        console.error("Failed to send deletion email", e);
      }
    }

    // Tables created by the migration cascade on auth.users delete; older ones may not.
    await Promise.all(
      USER_TABLES.map(async (t) => {
        const { error } = await admin.from(t).delete().eq("user_id", user.id);
        if (error && error.code !== "42P01") console.error(`Failed deleting from ${t}`, error.message);
      })
    );
    await admin.from("profiles").delete().eq("id", user.id);

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("Failed to delete auth user", error.message);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("/api/delete-account error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
