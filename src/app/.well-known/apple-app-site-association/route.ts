import { NextResponse } from "next/server";

// Lets iOS open tvtime.online links in the app (Universal Links). Needs APPLE_TEAM_ID
// from the Apple Developer account and the Associated Domains capability in Xcode.
export function GET() {
  const teamId = process.env.APPLE_TEAM_ID;
  if (!teamId) return NextResponse.json({ applinks: { details: [] } });

  return NextResponse.json(
    {
      applinks: {
        details: [{ appIDs: [`${teamId}.online.tvtime.app`], components: [{ "/": "/*" }] }],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
