import { createSign } from "crypto";

/**
 * Firebase Cloud Messaging (HTTP v1) for the Android app, with no SDK dependency.
 * FIREBASE_SERVICE_ACCOUNT holds the service-account JSON (raw or base64).
 */
interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    return parsed.project_id && parsed.client_email && parsed.private_key ? parsed : null;
  } catch {
    return null;
  }
}

export function fcmConfigured(): boolean {
  return !!serviceAccount();
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const enc = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${res.status}`);
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

export async function sendFcm(
  token: string,
  message: { title: string; body: string; url: string }
): Promise<"ok" | "gone" | "error"> {
  const sa = serviceAccount();
  if (!sa) return "error";
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken(sa)}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: message.title, body: message.body },
          data: { url: message.url },
          android: { priority: "HIGH", notification: { icon: "ic_stat_notify", color: "#FFD200" } },
        },
      }),
    });
    if (res.ok) return "ok";
    const text = await res.text().catch(() => "");
    if (res.status === 404 || text.includes("UNREGISTERED") || text.includes("registration token is not a valid")) {
      return "gone";
    }
    console.error("FCM send failed", res.status, text.slice(0, 200));
    return "error";
  } catch (e) {
    console.error("FCM send error", e);
    return "error";
  }
}
