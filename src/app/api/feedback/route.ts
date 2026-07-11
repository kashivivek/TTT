import { NextResponse } from "next/server";
import { Resend } from "resend";

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { type, message } = await req.json();

    if (!type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set. Simulating successful email send.");
      // If no API key is set, simulate success so the UI works during testing
      return NextResponse.json({ success: true, simulated: true });
    }

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: "TV Time Tracker <onboarding@resend.dev>", // Resend's default testing email
      to: "kashivivek@gmail.com",
      subject: `[TTT Feedback] ${type}`,
      html: `
        <h2>New Feedback Received</h2>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left: 4px solid #eee; padding-left: 10px; color: #555;">
          ${message.replace(/\n/g, "<br/>")}
        </blockquote>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
