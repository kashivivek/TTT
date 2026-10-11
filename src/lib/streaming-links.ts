import { appPlatform, isNativeApp } from "./native";
import { isTvMode } from "./tv";

/**
 * TMDB/JustWatch only gives a TMDB "watch" page link, not per-service deep links.
 * So we open the service's own search for the title: on phones Android hands these
 * URLs to the installed app when it supports them; on Android TV (no browser) we launch
 * the installed app by package name.
 */
interface ServiceInfo {
  match: RegExp;
  search: (q: string) => string;
  /** Android package names; TV builds often differ from phone builds. */
  phone: string[];
  tv: string[];
}

const enc = encodeURIComponent;

const SERVICES: ServiceInfo[] = [
  { match: /^netflix/i, search: (q) => `https://www.netflix.com/search?q=${enc(q)}`, phone: ["com.netflix.mediaclient"], tv: ["com.netflix.ninja"] },
  { match: /prime video|amazon video|amazon prime/i, search: (q) => `https://www.primevideo.com/search?phrase=${enc(q)}`, phone: ["com.amazon.avod.thirdpartyclient"], tv: ["com.amazon.amazonvideo.livingroom"] },
  { match: /disney/i, search: (q) => `https://www.disneyplus.com/search?q=${enc(q)}`, phone: ["com.disney.disneyplus", "in.startv.hotstar"], tv: ["com.disney.disneyplus", "in.startv.hotstar"] },
  { match: /hotstar/i, search: (q) => `https://www.hotstar.com/in/explore?search_query=${enc(q)}`, phone: ["in.startv.hotstar"], tv: ["in.startv.hotstar"] },
  { match: /^hulu/i, search: (q) => `https://www.hulu.com/search?q=${enc(q)}`, phone: ["com.hulu.plus"], tv: ["com.hulu.livingroomplus"] },
  { match: /^(hbo )?max\b|hbo max/i, search: (q) => `https://play.max.com/search?q=${enc(q)}`, phone: ["com.wbd.stream", "com.hbo.hbonow"], tv: ["com.wbd.stream", "com.hbo.hbonow"] },
  { match: /apple tv/i, search: (q) => `https://tv.apple.com/search?term=${enc(q)}`, phone: ["com.apple.atve.androidtv.appletv"], tv: ["com.apple.atve.androidtv.appletv"] },
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

/** Web URL used on the website and as the phone-app fallback. */
export function providerUrl(provider: ProviderLike, title: string, fallback?: string): string {
  const service = findService(provider.provider_name);
  if (service) return service.search(title);
  return fallback || `https://www.google.com/search?q=${enc(`watch ${title} on ${provider.provider_name}`)}`;
}

export type OpenResult = { ok: true } | { ok: false; message: string };

/** Opens a streaming service for a title in the best way for the current device. */
export async function openProvider(provider: ProviderLike, title: string, fallback?: string): Promise<OpenResult> {
  const url = providerUrl(provider, title, fallback);

  if (!isNativeApp()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true };
  }

  const service = findService(provider.provider_name);
  const { AppLauncher } = await import("@capacitor/app-launcher");

  if (appPlatform() === "android" && isTvMode()) {
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
    return {
      ok: false,
      message: service
        ? `${provider.provider_name} isn't installed on this TV. Install it from the Play Store, then search for "${title}".`
        : `Open ${provider.provider_name} on your TV and search for "${title}".`,
    };
  }

  // Phones/tablets: Android/iOS route the link into the installed app when it supports it.
  try {
    await AppLauncher.openUrl({ url });
  } catch {
    window.open(url, "_blank");
  }
  return { ok: true };
}
