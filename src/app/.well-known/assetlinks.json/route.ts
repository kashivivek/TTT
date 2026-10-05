import { NextResponse } from "next/server";

// Lets Android open tvtime.online links in the app. Set ANDROID_SHA256_CERT_FINGERPRINTS
// (comma-separated) to the app signing certificate fingerprints from Play Console.
export function GET() {
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  return NextResponse.json(
    fingerprints.length
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: { namespace: "android_app", package_name: "online.tvtime.app", sha256_cert_fingerprints: fingerprints },
          },
        ]
      : [],
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
