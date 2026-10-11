import { NextResponse, type NextRequest } from "next/server";

// Origins of the packaged Android (https://localhost) and iOS (capacitor://localhost) apps.
const APP_ORIGINS = new Set(["https://localhost", "capacitor://localhost", "http://localhost"]);

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = origin && APP_ORIGINS.has(origin) ? origin : null;

  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: allowed
        ? {
            "Access-Control-Allow-Origin": allowed,
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
            "Access-Control-Max-Age": "86400",
            Vary: "Origin",
          }
        : { Vary: "Origin" },
    });
  }

  const res = NextResponse.next();
  if (allowed) {
    res.headers.set("Access-Control-Allow-Origin", allowed);
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
