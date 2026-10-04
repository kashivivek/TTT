import { createPrivateKey, sign } from "crypto";

/**
 * Minimal VAPID web push (no payload). The service worker fetches the message
 * text from /api/push/pending, so no payload encryption is needed.
 */
export function vapidConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function vapidJwt(audience: string): string {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
  const pub = Buffer.from(publicKey, "base64url");
  const key = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: pub.subarray(1, 33).toString("base64url"),
      y: pub.subarray(33, 65).toString("base64url"),
      d: process.env.VAPID_PRIVATE_KEY as string,
    },
    format: "jwk",
  });

  const enc = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: process.env.VAPID_SUBJECT || "mailto:kashivivek@gmail.com",
  })}`;
  const signature = sign("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" });
  return `${unsigned}.${signature.toString("base64url")}`;
}

export async function sendPush(endpoint: string): Promise<"ok" | "gone" | "error"> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${vapidJwt(new URL(endpoint).origin)}, k=${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}`,
        TTL: "86400",
        Urgency: "normal",
      },
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
