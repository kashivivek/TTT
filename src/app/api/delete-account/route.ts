import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const authHeader = request.headers.get("authorization") || "";
    let accessToken = "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      accessToken = authHeader.slice(7).trim();
    } else {
      accessToken = body?.access_token || "";
    }

    const deletionReason = (body?.reason as string) || "unspecified";
    const deletionComments = (body?.comments as string) || "";

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Supabase service role key not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Resolve user using provided access token
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(anonKey ? { apikey: anonKey } : {}),
      },
    });

    if (!userRes.ok) {
      const txt = await userRes.text().catch(() => "");
      console.error("Failed to validate token", userRes.status, txt);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await userRes.json();
    const uid = user?.id;
    if (!uid) {
      return NextResponse.json({ error: "Unable to resolve user" }, { status: 404 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Record the deletion request in account_deletions first (best-effort)
    try {
      await supabaseAdmin.from("account_deletions").insert({
        user_id: uid,
        user_email: user?.email || null,
        reason: deletionReason,
        comments: deletionComments || null,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to insert account_deletions record", e?.message || e);
    }

    // Send deletion email (best-effort) using Resend if configured — reuse feedback flow
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.warn("RESEND_API_KEY is not set. Skipping deletion email.");
      } else {
        const subject = `[TTT Account Deletion] ${deletionReason} from ${user?.email || "Unknown"}`;
        const html = `
          <h2>Account Deletion Requested</h2>
          <p><strong>User ID:</strong> ${uid}</p>
          <p><strong>User Email:</strong> ${user?.email || "Not provided"}</p>
          <p><strong>Reason:</strong> ${deletionReason}</p>
          <p><strong>Comments:</strong></p>
          <blockquote style="border-left: 4px solid #eee; padding-left: 10px; color: #555;">${(deletionComments || "").replace(/\n/g, "<br/>")}</blockquote>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "TV Time Tracker <onboarding@resend.dev>",
            to: "kashivivek@gmail.com",
            reply_to: user?.email || "kashivivek@gmail.com",
            subject,
            html,
          }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Resend email failed", res.status, txt);
        }
      }
    } catch (e) {
      console.error("Failed to send deletion email", e);
    }

    // Best-effort: remove application data owned by the user (exclude account_deletions)
    const tables = [
      "watch_history",
      "tracked_shows",
      "user_ratings",
      "user_comments",
      "user_preferences",
    ];

    await Promise.all(
      tables.map((t) =>
        supabaseAdmin.from(t).delete().eq("user_id", uid).then(() => {}).catch((e) => {
          console.error(`Failed deleting from ${t}`, e?.message || e);
        })
      )
    );

    // Finally delete the auth user
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (error) {
        console.error("Failed to delete auth user", error.message || error);
        return NextResponse.json({ error: "Failed to delete auth user" }, { status: 500 });
      }
    } catch (e) {
      console.error("Error deleting auth user", e);
      return NextResponse.json({ error: "Failed to delete auth user" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("/api/delete-account error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
