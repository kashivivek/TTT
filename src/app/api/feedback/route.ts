import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { type, message, userId, userEmail } = await req.json();

    if (!type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Try to save to Supabase
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      await supabase.from("site_feedback").insert({
        user_id: userId || null,
        user_email: userEmail || null,
        type,
        message,
      });
    } catch (dbError) {
      console.error("Failed to save feedback to database:", dbError);
      // We don't fail the request here, just log the error and proceed to email
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn("RESEND_API_KEY is not set. Simulating successful email send.");
      // If no API key is set, simulate success so the UI works during testing
      return NextResponse.json({ success: true, simulated: true });
    }

    // Send the email using Resend's REST API directly (no package needed)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TV Time Tracker <onboarding@resend.dev>", // Resend's default testing email
        to: "kashivivek@gmail.com",
        reply_to: userEmail || "kashivivek@gmail.com",
        subject: `[TTT Feedback] ${type} from ${userEmail || "Anonymous"}`,
        html: `
          <h2>New Feedback Received</h2>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>User Email:</strong> ${userEmail || "Not provided"}</p>
          <p><strong>User ID:</strong> ${userId || "Not provided"}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #eee; padding-left: 10px; color: #555;">
            ${message.replace(/\n/g, "<br/>")}
          </blockquote>
        `,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
