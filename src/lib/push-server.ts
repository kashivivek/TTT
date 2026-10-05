import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPush, vapidConfigured } from "./webpush";
import { fcmConfigured, sendFcm } from "./fcm";

export interface PushMessage {
  title: string;
  body: string;
  url: string;
}

/** Sends a push to every device a user registered (web + Android). Returns how many were delivered. */
export async function sendPushToUser(admin: SupabaseClient, userId: string, message: PushMessage): Promise<number> {
  // select("*") so this works whether or not the platform column exists
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", userId);
  let delivered = 0;

  for (const sub of (subs || []) as Array<{ endpoint: string; platform?: string }>) {
    const platform = sub.platform || "web";
    let result: "ok" | "gone" | "error" | "skipped" = "skipped";

    if (platform === "web" && vapidConfigured()) {
      await admin.from("push_subscriptions").update({ last_payload: message }).eq("endpoint", sub.endpoint);
      result = await sendPush(sub.endpoint);
    } else if (platform === "android" && fcmConfigured()) {
      result = await sendFcm(sub.endpoint.split(":").slice(2).join(":"), message);
    }

    if (result === "gone") await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    if (result === "ok") delivered++;
  }
  return delivered;
}
