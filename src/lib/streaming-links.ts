import { registerPlugin } from "@capacitor/core";
import { appPlatform, isNativeApp } from "./native";
import { isTvMode } from "./tv";

// Native: android/app/src/main/java/online/tvtime/app/StreamingAppsPlugin.java (app 1.3+)
const StreamingApps = registerPlugin<{
  open(options: { url?: string; packages: string[] }): Promise<{ result: "title" | "app" | "none" }>;
}>("StreamingApps");

/**
 * Each service button opens the exact title page (from /api/watch-links) or the service's search.
 * Android only routes web links to apps that claim them (Netflix does; Hulu, Disney+, Prime mostly don't),
 * so in the Android app we send the link straight into the installed service app by package name.
 */
interface ServiceInfo {
  /** Key used by /api/watch-links for exact title pages. */
  key?: string;
  match: RegExp;
  search: (q: string) => string;
  /** Android package names; TV builds often differ from phone builds. */
  phone: string[];
  tv: string[];
}

const enc = encodeURIComponent;

const SERVICES: ServiceInfo[] = [
  { key: "netflix", match: /^netflix/i, search: (q) => `https://www.netflix.com/search?q=${enc(q)}`, phone: ["com.netflix.mediaclient"], tv: ["com.netflix.ninja"] },
  { key: "prime", match: /prime video|amazon video|amazon prime/i, search: (q) => `https://www.primevideo.com/search?phrase=${enc(q)}`, phone: ["com.amazon.avod.thirdpartyclient"], tv: ["com.amazon.amazonvideo.livingroom"] },
  { key: "disney", match: /disney/i, search: (q) => `https://www.disneyplus.com/search?q=${enc(q)}`, phone: ["com.disney.disneyplus", "in.startv.hotstar"], tv: ["com.disney.disneyplus", "in.startv.hotstar"] },
  { match: /hotstar/i, search: (q) => `https://www.hotstar.com/in/explore?search_query=${enc(q)}`, phone: ["in.startv.hotstar"], tv: ["in.startv.hotstar"] },
  { key: "hulu", match: /^hulu/i, search: (q) => `https://www.hulu.com/search?q=${enc(q)}`, phone: ["com.hulu.plus"], tv: ["com.hulu.livingroomplus"] },
  { key: "max", match: /^(hbo )?max\b|hbo max/i, search: (q) => `https://play.max.com/search?q=${enc(q)}`, phone: ["com.wbd.stream", "com.hbo.hbonow"], tv: ["com.wbd.stream", "com.hbo.hbonow"] },
  { key: "apple", match: /apple tv/i, search: (q) => `https://tv.apple.com/search?term=${enc(q)}`, phone: ["com.apple.atve.androidtv.appletv"], tv: ["com.apple.atve.androidtv.appletv"] },
  { match: /paramount/i, search: (q) => `https://www.paramountplus.com/search/?q=${enc(q)}`, phone: ["com.cbs.app"], tv: ["com.cbs.ott"] },
  { match: /peacock/i, search: (q) => `https://www.peacocktv.com/search?q=${enc(q)}`, phone: ["com.peacocktv.peacockandroid"], tv: ["com.peacocktv.peacockandroid"] },
  { match: /youtube/i, search: (q) => `https://www.youtube.com/results?search_query=${enc(q)}`, phone: ["com.google.android.youtube"], tv: ["com.google.android.youtube.tv", "com.google.android.youtube.tvunplugged"] },
  { match: /google play|google tv/i, search: (q) => `https://play.google.com/store/search?q=${enc(q)}&c=movies`, phone: ["com.google.android.videos"], tv: ["com.google.android.videos"] },
  { match: /crunchyroll/i, search: (q) => `https://www.crunchyroll.com/search?q=${enc(q)}`, phone: ["com.crunchyroll.crunchyroid"], tv: ["com.crunchyroll.crunchyroid"] },
  { match: /^tubi/i, search: (q) => `https://tubitv.com/search/${enc(q)}`, phone: ["com.tubitv"], tv: ["com.tubitv"] },
  { match: /pluto/i, search: (q) => `https://pluto.tv/search/details?query=${enc(q)}`, phone: ["tv.pluto.android"], tv: ["tv.pluto.android"] },
  { match: /jio/i, search: (q) => `https://www.jiocinema.com/search/${enc(q)}`, phone: ["com.jio.media.ondemand"], tv: ["com.jio.media.stb.ondemand", "com.jio.media.ondemand"] },
  { match: /sony ?liv/i, search: (q) => `https://www.sonyliv.com/search?searchTerm=${enc(q)}`, phone: ["com.sonyliv"], tv: ["com.sonyliv"] },
  { match: /zee5/i, search: (q) => `https://www.zee5.com/search?q=${enc(q)}`, phone: ["com.graymatrix.did"], tv: ["com.graymatrix.did"] },
  { match: /starz/i, search: (q) => `https://www.starz.com/us/en/search?q=${enc(q)}`, phone: ["com.bydeluxe.d3.android.program.starz"], tv: ["com.bydeluxe.d3.android.program.starz"] },
  { match: /^mubi/i, search: (q) => `https://mubi.com/en/search/films?query=${enc(q)}`, phone: ["com.mubi"], tv: ["com.mubi"] },
  { match: /^plex/i, search: (q) => `https://watch.plex.tv/search?q=${enc(q)}`, phone: ["com.plexapp.android"], tv: ["com.plexapp.android"] },
  { match: /fubo/i, search: (q) => `https://www.fubo.tv/search?q=${enc(q)}`, phone: ["com.fubo.mobile"], tv: ["com.fubo.firetv.screen", "com.fubo.mobile"] },
];

export interface ProviderLike {
  provider_name: string;
}

function findService(name: string): ServiceInfo | undefined {
  return SERVICES.find((s) => s.match.test(name));
}

/** Exact title page for this provider from /api/watch-links, if known. */
export function directLink(provider: ProviderLike, links: Record<string, string> | undefined): string | undefined {
  const key = findService(provider.provider_name)?.key;
  return key ? links?.[key] : undefined;
}

/** Web URL used on the website and as the phone-app fallback. */
export function providerUrl(provider: ProviderLike, title: string, fallback?: string, direct?: string): string {
  if (direct) return direct;
  const service = findService(provider.provider_name);
  if (service) return service.search(title);
  return fallback || `https://www.google.com/search?q=${enc(`watch ${title} on ${provider.provider_name}`)}`;
}

export type OpenResult = { ok: true } | { ok: false; message: string };

/** Opens a streaming service for a title in the best way for the current device. */
export async function openProvider(provider: ProviderLike, title: string, fallback?: string, direct?: string): Promise<OpenResult> {
  const url = providerUrl(provider, title, fallback, direct);

  if (!isNativeApp()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true };
  }

  const service = findService(provider.provider_name);
  const tv = appPlatform() === "android" && isTvMode();
  const notInstalled: OpenResult = {
    ok: false,
    message: service
      ? `${provider.provider_name} isn't installed on this TV. Install it from the Play Store, then search for "${title}".`
      : `Open ${provider.provider_name} on your TV and search for "${title}".`,
  };

  if (appPlatform() === "android" && service) {
    const packages = tv ? [...service.tv, ...service.phone] : [...service.phone, ...service.tv];
    try {
      const { result } = await StreamingApps.open({ url, packages });
      if (result !== "none") return { ok: true };
      if (tv) return notInstalled;
      // Phone without the app: open the website below
    } catch {
      // Older app build without the plugin: fall back below
    }
  }

  const { AppLauncher } = await import("@capacitor/app-launcher");

  if (tv) {
    for (const pkg of service ? [...service.tv, ...service.phone] : []) {
      try {
        const { value } = await AppLauncher.canOpenUrl({ url: pkg });
        if (value) {
          await AppLauncher.openUrl({ url: pkg });
          return { ok: true };
        }
      } catch {
        // Try the next package
      }
    }
    return notInstalled;
  }

  // Phones/tablets: Android/iOS route the link into the installed app when it supports it.
  try {
    await AppLauncher.openUrl({ url });
  } catch {
    window.open(url, "_blank");
  }
  return { ok: true };
}
