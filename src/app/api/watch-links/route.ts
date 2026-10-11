import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/server-auth";

/**
 * Exact title pages on streaming services, from Wikidata (free, CC0).
 * Wikidata maps the TMDB ID to each service's own ID and stores each service's URL pattern.
 */
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "TTT/1.0 (https://tvtime.online; tvtimetracker@zohomail.com)";
const DAY = 86400;

const TMDB_PROP = { movie: "P4947", tv: "P4983" } as const;

// Service key (matches src/lib/streaming-links.ts) -> Wikidata ID properties + allowed link hosts.
// Hosts are checked because Wikidata is publicly editable.
const SERVICES: Record<string, { movie: string; tv: string; hosts: RegExp }> = {
  netflix: { movie: "P1874", tv: "P1874", hosts: /(^|\.)netflix\.com$/ },
  disney: { movie: "P7595", tv: "P7596", hosts: /(^|\.)disneyplus\.com$/ },
  prime: { movie: "P8055", tv: "P8055", hosts: /(^|\.)(primevideo|amazon)\.com$/ },
  apple: { movie: "P9586", tv: "P9751", hosts: /^tv\.apple\.com$/ },
  max: { movie: "P8298", tv: "P8298", hosts: /(^|\.)(max|hbomax)\.com$/ },
  hulu: { movie: "P6466", tv: "P6467", hosts: /(^|\.)hulu\.com$/ },
};

const SAFE_ID = /^[A-Za-z0-9._:-]{1,80}$/;

async function wikidata(params: Record<string, string>): Promise<any> {
  const url = `${WIKIDATA_API}?${new URLSearchParams({ format: "json", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, next: { revalidate: DAY } });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  return res.json();
}

/** Best string value of a claim: "preferred" rank first, never "deprecated" (e.g. Max's old hbomax.com URL). */
function firstValue(claims: any, prop: string): string | null {
  const statements: any[] = (claims?.[prop] || []).filter((s: any) => s.rank !== "deprecated");
  const best = statements.find((s) => s.rank === "preferred") || statements[0];
  const value = best?.mainsnak?.datavalue?.value;
  return typeof value === "string" ? value : null;
}

/** URL pattern ("formatter URL", P1630) of each ID property, e.g. https://www.netflix.com/title/$1 */
async function formatterUrls(props: string[]): Promise<Record<string, string>> {
  const data = await wikidata({ action: "wbgetentities", ids: props.join("|"), props: "claims" });
  const out: Record<string, string> = {};
  for (const prop of props) {
    const formatter = firstValue(data.entities?.[prop]?.claims, "P1630");
    if (formatter) out[prop] = formatter;
  }
  return out;
}

export async function GET(request: NextRequest) {
  if (!rateLimit(`watch-links:${clientIp(request)}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id") || "";
  if ((type !== "movie" && type !== "tv") || !/^\d{1,9}$/.test(id)) {
    return NextResponse.json({ error: "Invalid type or id" }, { status: 400 });
  }

  try {
    const search = await wikidata({
      action: "query",
      list: "search",
      srsearch: `haswbstatement:${TMDB_PROP[type]}=${id}`,
      srlimit: "1",
    });
    const qid: string | undefined = search.query?.search?.[0]?.title;
    const links: Record<string, string> = {};

    if (qid && /^Q\d+$/.test(qid)) {
      const props = [...new Set(Object.values(SERVICES).map((s) => s[type]))];
      const [entity, formatters] = await Promise.all([
        wikidata({ action: "wbgetentities", ids: qid, props: "claims" }),
        formatterUrls(props),
      ]);
      const claims = entity.entities?.[qid]?.claims;

      for (const [key, service] of Object.entries(SERVICES)) {
        const serviceId = firstValue(claims, service[type]);
        const formatter = formatters[service[type]];
        if (!serviceId || !formatter || !SAFE_ID.test(serviceId)) continue;
        try {
          const url = new URL(formatter.replace("$1", encodeURIComponent(serviceId)));
          if (url.protocol === "https:" && service.hosts.test(url.hostname)) links[key] = url.toString();
        } catch {
          // Bad formatter on Wikidata: skip this service
        }
      }
    }

    return NextResponse.json(
      { links },
      { headers: { "Cache-Control": `public, s-maxage=${DAY}, stale-while-revalidate=${7 * DAY}` } }
    );
  } catch {
    // Callers fall back to search links
    return NextResponse.json({ links: {} }, { headers: { "Cache-Control": "public, s-maxage=600" } });
  }
}
