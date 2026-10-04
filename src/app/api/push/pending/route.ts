import { NextRequest, NextResponse } from "next/server";
import { clientIp, getAdminClient } from "@/lib/server-auth";
import { rateLimit } from "@/lib/rate-limit";

const DEFAULT_MESSAGE = { title: "New episodes are out", body: "Shows you track have new episodes.", url: "/calendar" };

/** Called by the service worker on push; the endpoint URL acts as an unguessable key. */
export async function GET(request: NextRequest) {
  if (!rateLimit(`push-pending:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json(DEFAULT_MESSAGE);
  }
  const endpoint = request.nextUrl.searchParams.get("endpoint");
  const admin = getAdminClient();
  if (!endpoint || !admin) return NextResponse.json(DEFAULT_MESSAGE);

  const { data } = await admin.from("push_subscriptions").select("last_payload").eq("endpoint", endpoint).maybeSingle();
  return NextResponse.json(data?.last_payload || DEFAULT_MESSAGE, { headers: { "Cache-Control": "no-store" } });
}
