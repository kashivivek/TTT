// Builds the static app bundle (out/) that ships inside the Android/iOS apps.
//   node scripts/build-app-bundle.mjs            -> out/ only (used before cap sync / native builds)
//   node scripts/build-app-bundle.mjs --publish  -> also public/app-bundle/<version>.zip + latest.json
//                                                  (runs in the Vercel build, so every deploy is a live update)
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";

// Raise when a web change needs native code newer than this versionCode (e.g. a new Capacitor plugin).
const MIN_NATIVE_BUILD = 3;

const publish = process.argv.includes("--publish");
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tvtime.online";
const sha = process.env.VERCEL_GIT_COMMIT_SHA;
const version = sha ? sha.slice(0, 12) : `local-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
const publishDir = join("public", "app-bundle");

rmSync(publishDir, { recursive: true, force: true });
rmSync("out", { recursive: true, force: true });

const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_APP_BUNDLE: "1", NEXT_PUBLIC_BUNDLE_VERSION: version },
});
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`App bundle ${version} built in out/`);

if (!publish) process.exit(0);

const files = {};
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files[relative("out", path).split("\\").join("/")] = readFileSync(path);
  }
};
walk("out");

const zip = zipSync(files, { level: 9 });
mkdirSync(publishDir, { recursive: true });
writeFileSync(join(publishDir, `${version}.zip`), zip);
writeFileSync(
  join(publishDir, "latest.json"),
  JSON.stringify({
    version,
    url: `${siteUrl}/app-bundle/${version}.zip`,
    checksum: createHash("sha256").update(zip).digest("hex"),
    minNativeBuild: MIN_NATIVE_BUILD,
  })
);
console.log(`Published live update ${version} (${(zip.length / 1024 / 1024).toFixed(1)} MB)`);
