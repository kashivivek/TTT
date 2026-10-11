import { IS_APP_BUNDLE } from "./app-routes";
import { SITE_URL } from "./site";

/**
 * Self-hosted live updates: every Vercel deploy publishes the app bundle at /app-bundle/latest.json
 * (scripts/build-app-bundle.mjs). The app downloads newer bundles in the background and switches
 * to them the next time it goes to the background, so web changes reach the apps without a store release.
 */
const RUNNING_VERSION = process.env.NEXT_PUBLIC_BUNDLE_VERSION || "dev";

interface LatestBundle {
  version: string;
  url: string;
  checksum: string;
  minNativeBuild: number;
}

let checking = false;
let pendingId: string | null = null;

async function updater() {
  return (await import("@capgo/capacitor-updater")).CapacitorUpdater;
}

/** Must run on every start, or the plugin rolls back to the previous bundle. */
export async function markAppReady(): Promise<void> {
  if (!IS_APP_BUNDLE) return;
  try {
    await (await updater()).notifyAppReady();
  } catch {
    // Plugin missing in very old native builds
  }
}

export async function checkForLiveUpdate(): Promise<void> {
  if (!IS_APP_BUNDLE || checking || pendingId) return;
  checking = true;
  try {
    const res = await fetch(`${SITE_URL}/app-bundle/latest.json`, { cache: "no-store" });
    if (!res.ok) return;
    const latest: LatestBundle = await res.json();
    if (!latest.version || latest.version === RUNNING_VERSION) return;

    const { App } = await import("@capacitor/app");
    const { build } = await App.getInfo();
    if (Number(build) < latest.minNativeBuild) return; // Needs a store update first

    const CapacitorUpdater = await updater();
    const { bundles } = await CapacitorUpdater.list();
    const bundle =
      bundles.find((b) => b.version === latest.version && b.status !== "error") ||
      (await CapacitorUpdater.download({ url: latest.url, version: latest.version, checksum: latest.checksum }));
    await CapacitorUpdater.next({ id: bundle.id });
    pendingId = bundle.id;
  } catch {
    // Offline or bad download: try again on next resume
  } finally {
    checking = false;
  }
}

/** Switch to a downloaded bundle while the app is in the background, so the user never sees a reload. */
export async function applyPendingUpdate(): Promise<void> {
  if (!pendingId) return;
  const id = pendingId;
  pendingId = null;
  try {
    await (await updater()).set({ id });
  } catch {
    // Applied on next launch instead
  }
}
