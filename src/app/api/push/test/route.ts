import { NextResponse } from "next/server";
import { getAdminClient, getUserFromRequest } from "@/lib/server-auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push-server";

/** Sends a test push to the signed-in user's own devices. */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!rateLimit(`push-test:${user.id}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many test notifications. Try again in a few minutes." }, { status: 429 });
  }

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const delivered = await sendPushToUser(admin, user.id, {
    title: "Test notification 🎬",
    body: "Push alerts are working. You'll hear from us when your shows air new episodes.",
    url: "/calendar",
  });

  if (delivered === 0) {
    return NextResponse.json(
      { error: "No device received it. Turn push off and on again on this device, then retry." },
      { status: 404 }
    );
  }
  return NextResponse.json({ delivered });
}
