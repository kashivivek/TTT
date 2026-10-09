import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, escapeHtml, getUserFromRequest } from "@/lib/server-auth";
import { rateLimit } from "@/lib/rate-limit";

const FEEDBACK_TYPES = new Set(["Bug", "Feedback", "Request"]);
const MAX_MESSAGE = 4000;
const MIN_ANON_MESSAGE = 15;
const MIN_FILL_MS = 3000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Anonymous form spam: honeypot filled, submitted too fast, or the "message" is just an email/link. */
function looksLikeSpam(body: Record<string, unknown>, message: string): string | null {
  if (typeof body.website === "string" && body.website.trim()) return "honeypot";
  if (typeof body.elapsedMs !== "number" || body.elapsedMs < MIN_FILL_MS) return "too-fast";
  const words = message.replace(/\S+@\S+\.\S+/g, "").replace(/https?:\/\/\S+/g, "").trim();
  if (words.length < MIN_ANON_MESSAGE) return "no-message";
  return null;
}

export async function POST(req: Request) {
  try {
    if (!rateLimit(`feedback:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many submissions, try again later." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const type = FEEDBACK_TYPES.has(body?.type) ? String(body.type) : "Feedback";
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
    if (!message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Identity comes from the session, never from the request body.
    const user = await getUserFromRequest(req);
    const userId = user?.id ?? null;
    const contactEmail =
      typeof body?.email === "string" && EMAIL_RE.test(body.email.trim()) ? body.email.trim().slice(0, 254) : null;
    const userEmail = user?.email ?? contactEmail;

    if (!user) {
      const spamReason = looksLikeSpam(body ?? {}, message);
      if (spamReason) {
        console.warn("Feedback rejected", spamReason, clientIp(req), req.headers.get("user-agent")?.slice(0, 120));
        // Real people get a hint; bots learn nothing useful.
        return NextResponse.json(
          { error: spamReason === "no-message" ? "Please describe how we can help." : "Couldn't send. Please try again." },
          { status: 400 }
        );
      }
    }

    const source = [
      req.headers.get("x-vercel-ip-country") || "?",
      (req.headers.get("referer") || "").replace(/^https?:\/\/[^/]+/, "") || "?",
      (req.headers.get("user-agent") || "?").slice(0, 120),
    ].join(" · ");

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.from("site_feedback").insert({ user_id: userId, user_email: userEmail, type, message });
    } catch (dbError) {
      console.error("Failed to save feedback to database:", dbError);
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, simulated: true });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "TV Time Tracker <onboarding@resend.dev>",
        to: process.env.ADMIN_EMAIL || "kashivivek@gmail.com",
        reply_to: userEmail || undefined,
        subject: `[TTT Feedback] ${type} from ${userEmail || "Anonymous"}`.replace(/[\r\n]/g, " "),
        html: `
          <h2>New Feedback Received</h2>
          <p><strong>Type:</strong> ${escapeHtml(type)}</p>
          <p><strong>User Email:</strong> ${escapeHtml(userEmail || "Not provided")}${user ? "" : contactEmail ? " (entered on contact form)" : ""}</p>
          <p><strong>User ID:</strong> ${escapeHtml(userId || "Not logged in")}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #eee; padding-left: 10px; color: #555;">
            ${escapeHtml(message).replace(/\n/g, "<br/>")}
          </blockquote>
          <p style="color:#888;font-size:12px">Source: ${escapeHtml(source)}</p>
        `,
      }),
    });

    if (!res.ok) {
      console.error("Resend feedback email failed", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "Failed to send feedback" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/feedback error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
