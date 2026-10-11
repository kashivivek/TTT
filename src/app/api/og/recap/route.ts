import { createElement } from "react";
import { ImageResponse } from "next/og";
import { parseRecapParams } from "@/lib/recap";
import RecapImage from "@/components/RecapImage";

export const runtime = "edge";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const p = parseRecapParams((k) => params.get(k));

  return new ImageResponse(createElement(RecapImage, { p }), { width: 1200, height: 630 });
}
