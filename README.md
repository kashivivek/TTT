# TV Time Tracker

A free, independent TV & movie tracker (a TV Time alternative) at **https://tvtime.online**.
One Next.js codebase powers the **website**, the **Android app** (phones + Android TV) and the **iOS app**.

- [Features](#features)
- [Tech stack & architecture](#tech-stack--architecture)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database (Supabase)](#database-supabase)
- [How progress tracking works](#how-progress-tracking-works)
- [Background job & notifications](#background-job--notifications)
- [Security model](#security-model)
- [Analytics](#analytics)
- [SEO & AdSense](#seo--adsense)
- [Mobile apps (Capacitor)](#mobile-apps-capacitor)
- [Android TV](#android-tv)
- [Release checklists](#release-checklists)
- [Gotchas](#gotchas)

---

## Features

- **Tracking:** next episode to watch per show; one-tap "watched" with **Undo**; mark a whole season; "also mark earlier episodes?" prompt; unaired episodes can't be checked off.
- **Smart lists:** Shows (active) / Not Watched Recently (2+ weeks) / Upcoming / Completed; shows that get new seasons come back automatically.
- **Upcoming calendar** (`/calendar`): next 60 days of episodes for tracked shows + "recently aired".
- **Alerts:** daily email digest and push notifications (web push, Android FCM).
- **TV Time import:** upload the GDPR `.zip` export (runs in the browser) — history, movies, ratings, badges, favorites.
- **Discover:** trending, AI suggestions (Groq), where-to-watch per country (TMDB/JustWatch).
- **Community:** comments with display names, reactions, spoiler tags, delete own, report.
- **Engagement:** streaks, auto-awarded badges, favorites, shareable "year in TV" recap with OG image.
- **Public SEO pages:** server-rendered `/shows/[id]` and `/movies/[id]` with metadata + JSON-LD; sitemap of popular titles.
- **Policy pages:** `/about`, `/privacy`, `/terms`, `/contact` (+ footer on public pages).

## Tech stack & architecture

| Layer | Tech |
|---|---|
| Web app | Next.js 15 (App Router), React 19, Tailwind 3 |
| Auth + DB | Supabase (Postgres + Auth, RLS) — browser talks to Supabase directly with the anon key |
| Show data | TMDB API via our proxy `/api/tmdb` (key stays server-side) |
| Hosting | Vercel (+ Vercel Cron, Analytics, Speed Insights) |
| Email | Resend |
| AI | Groq (`/api/groq-suggestions`) |
| Product analytics | PostHog (HTTP capture, no SDK) |
| Mobile | Capacitor 8 — native shells that load https://tvtime.online |

Key folders:

```
src/app/                 routes (pages + API)
  api/tmdb               TMDB proxy (allow-listed paths, cached, rate-limited)
  api/groq-suggestions   AI suggestions (login required, rate-limited)
  api/feedback           feedback/contact form → Supabase + email to ADMIN_EMAIL
  api/delete-account     server-side account deletion (service role)
  api/cron/new-episodes  daily job: resurface shows + send alerts
  api/push/pending       service worker fetches web-push message text
  api/og/recap           OG image for shared recaps
  .well-known/           assetlinks.json (Android) + apple-app-site-association (iOS)
  shows/[id], movies/[id]  server page.tsx (SEO) + *DetailsClient.tsx (interactive)
src/lib/
  progress.ts            next-episode logic (shared by web, importer and cron)
  tracking.ts            saves the "next episode" pointer for a show
  import-parser.ts       TV Time zip importer
  server-auth.ts         validate Supabase token in API routes, admin client, escapeHtml
  rate-limit.ts          best-effort per-instance limiter
  analytics.ts           PostHog + Vercel events (adds platform + tv flags)
  push-client.ts         web push + native push registration
  webpush.ts / fcm.ts    server senders (VAPID / Firebase HTTP v1), no SDKs
  native.ts / tv.ts      app/TV detection, D-pad focus navigation
src/components/          UI (NativeBridge, FocusNavigation, AdSenseScript, …)
supabase/migrations/     SQL to run in the Supabase SQL editor (in order)
android/ ios/            Capacitor native projects (committed)
mobile-shell/            tiny local web folder bundled in the apps (offline page)
assets/                  source logo for app icons/splash (@capacitor/assets)
scripts/                 android-keystore.sh
```

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in values (never commit .env.local)
npm run dev                        # http://localhost:3000
npx tsc --noEmit                   # type-check
npx next build                     # production build check
```

## Environment variables

Set in **Vercel → Project → Settings → Environment Variables** (Production + Preview) and in `.env.local` for local dev.
`.env.local.example` is committed and must only ever contain **placeholders**.
`NEXT_PUBLIC_*` values are baked in at build time → **redeploy after changing them**.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Sensitive.** Account deletion, cron, push lookup |
| `TMDB_API_KEY` | yes | server-only |
| `CRON_SECRET` | yes | **Sensitive.** `openssl rand -hex 32`. Vercel Cron sends it as `Authorization: Bearer …` |
| `GROQ_API_KEY` (+ `GROQ_MODEL`, `GROQ_API_URL`) | for AI | |
| `RESEND_API_KEY` | for email | |
| `RESEND_FROM` | for user emails | e.g. `TV Time Tracker <alerts@tvtime.online>`; only after the domain is verified in Resend. Without it, digests to users are skipped |
| `ADMIN_EMAIL` | optional | where feedback/deletion notices go (default kashivivek@gmail.com) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | optional | shown on policy pages (default tvtimetracker@zohomail.com) |
| `NEXT_PUBLIC_SITE_URL` | optional | default `https://tvtime.online` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | for web push | generate once (command in `.env.local.example`); private key is **Sensitive**. Regenerating invalidates all web-push subscriptions |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | optional | `phc_…` project key (public), `https://us.i.posthog.com` |
| `NEXT_PUBLIC_ADSENSE_PUB_ID`, `NEXT_PUBLIC_ADSENSE_LEFT_SLOT`, `NEXT_PUBLIC_ADSENSE_RIGHT_SLOT` | optional | ad units hidden when slot is empty |
| `FIREBASE_SERVICE_ACCOUNT` | for app push | **Sensitive.** Firebase service-account JSON (raw or base64) |
| `NEXT_PUBLIC_NATIVE_PUSH_PLATFORMS` | for app push | `android` (later `android,ios`). Until set, the app shows "push coming soon" |
| `ANDROID_SHA256_CERT_FINGERPRINTS` | for app links | comma-separated, from Play Console → App integrity |
| `APPLE_TEAM_ID` | for iOS universal links | from Apple Developer account |

## Database (Supabase)

Run migrations **in order** in the Supabase SQL editor (when it warns about "RLS", choose **Run without RLS** — the scripts enable RLS themselves):

1. `20261003000000_retention_and_security.sql` — ✅ run on prod. Removes the old "Allow all access" policy, de-dupes `watch_history`, adds unique/perf indexes, new tables (`profiles`, `comment_reactions`, `comment_reports`, `notification_preferences`, `push_subscriptions`, `account_deletions`), enables RLS everywhere.
2. `20261004000000_native_push.sql` — ✅ run on prod. Adds `push_subscriptions.platform`.

Schema facts worth remembering:

- `watch_history`: unique `(user_id, tmdb_id, season_number, episode_number)`; `media_type` CHECK is `movie|tv` only. Movies have null season/episode (rewatches allowed).
- `tracked_shows`: unique `(user_id, tmdb_id)`; `name` NOT NULL; `media_type` is also used as a **status** (see below).
- `user_ratings`: unique `(user_id, tmdb_id, media_type)` → one rating per title.
- `user_comments.id` is `uuid`.
- RLS: every user table = owner-only for `authenticated`. Public read: `user_comments`, `profiles`, `comment_reactions`, public `custom_lists`. `site_feedback` = insert-only. `account_deletions` = service role only.

Verify RLS anytime:

```sql
select c.relname, c.relrowsecurity,
       coalesce(json_agg(p.policyname) filter (where p.policyname is not null), '[]')
from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where c.relkind = 'r' group by 1, 2 order by 1;
```

Activity check:

```sql
select
  (select count(*) from auth.users) as total_users,
  (select count(distinct user_id) from public.watch_history where watched_at > now() - interval '7 days')  as active_7d,
  (select count(distinct user_id) from public.watch_history where watched_at > now() - interval '30 days') as active_30d;
```

## How progress tracking works

`tracked_shows.media_type` doubles as the show's state, and `current_season/current_episode` mean different things per state (see `src/lib/progress.ts`):

| `media_type` | `episode_title` | `current_*` points to |
|---|---|---|
| `tv` | episode name | the **next episode to watch** (already aired) |
| `awaiting` | `Airs: YYYY-MM-DD - name` | the next episode (not aired yet) |
| `awaiting` | `Waiting for new episodes` | the **last watched** episode |
| `completed` | `Completed` | the last watched episode (show ended/canceled) |
| `movie` / `completed_movie` | — | watchlist / watched movie |

- `resolveNextAfter()` computes the next state after an episode; `refreshTrackState()` re-checks awaiting/completed rows.
- Refresh happens on dashboard load (throttled 12h per show) and in the daily cron for users with alerts on.
- `updated_at` = last activity; drives "Not Watched Recently" (>14 days).
- Legacy rows titled `Release date not yet confirmed` with episode 1 are treated as "next episode" pointers.

## Background job & notifications

- **Cron:** `vercel.json` → `GET /api/cron/new-episodes` daily at 14:00 UTC. Scoped to users with alerts enabled; stops TMDB work at 35s to stay under Vercel's 60s limit. Returns JSON counts.
- Manual run (off corporate network, never paste the secret into websites):
  ```bash
  read -s CRON_SECRET; curl -i -H "Authorization: Bearer $CRON_SECRET" https://tvtime.online/api/cron/new-episodes
  ```
- **Web push:** VAPID, no payload; the service worker (`public/sw.js`) fetches text from `/api/push/pending`.
- **Android push:** FCM HTTP v1 (`src/lib/fcm.ts`); tokens stored as `endpoint = native:android:<token>`, `platform = android`.
- **iOS push:** not wired yet (needs Apple Developer account + APNs key in Firebase).
- **Email:** Resend; only when `RESEND_FROM` is set.

## Security model

- Browser uses the Supabase anon key → **RLS is the only protection**; keep it on for every new table.
- Server routes validate the user's Supabase access token (`getUserFromRequest`); client calls use `authFetch()`.
- `/api/tmdb` only proxies allow-listed TMDB paths; responses are CDN-cached.
- AI, feedback, TMDB and push-pending endpoints are rate-limited (best-effort, per instance).
- All user text in emails goes through `escapeHtml`.
- Login/signup `?next=` redirects are restricted to same-site paths (`safeNext`).
- The service worker only caches static assets — never API or Supabase responses.

## Analytics

- **Vercel Analytics / Speed Insights:** traffic & performance (Vercel dashboard).
- **PostHog:** events sent via `track()` in `src/lib/analytics.ts`. Every event includes `platform` (`web|android|ios`) and `tv`.
  Events: `$pageview`, `$identify`, `sign_up`, `login`, `signup_prompt`, `track_show`, `untrack_show`, `mark_watched`, `mark_season_watched`, `undo_watched`, `show_completed`, `favorite`, `comment_posted`, `badge_earned`, `share_recap`, `notifications_enabled`, `ai_search`, `ai_suggest_me`, `import_completed`, `account_deleted`.
- Useful PostHog insights: Retention (`sign_up` → `mark_watched`, weekly), Trends (weekly unique `$pageview`), Funnel (`signup_prompt` → `sign_up` → `track_show` → `mark_watched`).

## SEO & AdSense

- Show/movie pages are server-rendered (ISR, 1 day), with canonical URLs, OG/Twitter tags and JSON-LD.
- Sitemap: `https://tvtime.online/sitemap.xml` (static pages + popular/trending titles, refreshed daily). Submitted in Google Search Console.
- `robots.txt` blocks `/api`, `/dashboard`, `/profile`, `/calendar`.
- AdSense: `ads.txt` in `public/`, `google-adsense-account` meta tag, script loads on the website only (`AdSenseScript`), never inside the apps.
- Domains (Vercel): `tvtime.online` = production; `www.tvtime.online` redirects to it (use 308).
- History: AdSense said "site down" for months because the homepage rendered empty HTML for crawlers; fixed Oct 2026 (homepage + show pages now render server-side), and policy pages were added.

## Mobile apps (Capacitor)

The apps are **native shells that load https://tvtime.online** (`capacitor.config.ts → server.url`).
Every web deploy updates the apps instantly — store updates are only needed for native changes (plugins, icons, manifest, permissions).

| | |
|---|---|
| App ID | `online.tvtime.app` |
| Capacitor | 8 (Android target/compile SDK 36, min SDK 24; iOS via Swift Package Manager) |
| Plugins | app, push-notifications, splash-screen, status-bar, share |
| User agent suffix | `TTTApp` |
| Offline page | `mobile-shell/offline.html` (`server.errorPath`) |

Native behaviour (`src/components/NativeBridge.tsx`): Android back button, deep links (`appUrlOpen`), status bar, splash hide, push registration + tap-to-open. Ads are hidden in the app (`AdBanner`, `AdSenseScript`). The service worker is not registered in the app.

Scripts (run **off the corporate VPN** — Gradle/Maven downloads are blocked there):

| Command | What it does |
|---|---|
| `npm run cap:sync` | copy config/plugins into `android/` and `ios/` (run after adding/updating plugins) |
| `npm run android:run` | build + install on a connected phone/TV/emulator |
| `npm run android:dev` | same, but the app loads `npm run dev:lan` on your Mac (test unpushed web changes in the app; phone + Mac on the same Wi-Fi) |
| `npm run android:apk` | debug APK → `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run android:keystore` | create the Play upload key (`android/upload-keystore.jks` + `android/keystore.properties`, git-ignored — **back them up**) |
| `npm run android:bundle` | signed release bundle → `android/app/build/outputs/bundle/release/app-release.aab` |
| `npm run android` / `npm run ios` | open in Android Studio / Xcode (optional) |

Install on your phone: Settings → About phone → tap **Build number** ×7 → Developer options → **USB debugging** → connect → `npm run android:run`.

Icons & splash: generated from `assets/logo.png`:

```bash
npx @capacitor/assets generate --android --ios --iconBackgroundColor '#141414' --iconBackgroundColorDark '#141414' --splashBackgroundColor '#141414' --splashBackgroundColorDark '#141414'
```

Notification icon: `android/app/src/main/res/drawable/ic_stat_notify.xml` (white "T" silhouette; Android tints it). Accent color `#FFD200` in `res/values/colors_ttt.xml`.

### Android push setup (Firebase)

1. Firebase console → project → **Add app → Android** → package `online.tvtime.app`.
2. Put `google-services.json` in `android/app/` (git-ignored; re-download from Firebase → Project settings if lost).
3. Project settings → Service accounts → **Generate new private key** → Vercel `FIREBASE_SERVICE_ACCOUNT` (Sensitive).
4. Vercel `NEXT_PUBLIC_NATIVE_PUSH_PLATFORMS=android` → redeploy.

### Deep links

- Android: intent filter for `https://tvtime.online` (autoVerify) + `/.well-known/assetlinks.json` built from `ANDROID_SHA256_CERT_FINGERPRINTS`.
- iOS: `/.well-known/apple-app-site-association` from `APPLE_TEAM_ID`; also needs the Associated Domains capability in Xcode (`applinks:tvtime.online`).

### iOS (prepared, not published)

- `npm run ios` opens Xcode; runs in the Simulator without an account.
- Needs: Apple Developer account ($99/yr), signing team in Xcode, APNs key uploaded to Firebase, iOS push wiring (APNs token → FCM), Associated Domains, `APPLE_TEAM_ID`.
- Risk: App Review guideline 4.2 (web-wrapper apps). Native push/share/deep links help.

## Android TV

The same APK runs on Android TV:

- Manifest: `LEANBACK_LAUNCHER` category, `android.software.leanback` and `touchscreen` **not required**, `android:banner="@drawable/tv_banner"` (placeholder: `res/drawable-xhdpi/tv_banner.png`, 640×360 — replace with a designed banner incl. app name).
- TV mode (`src/lib/tv.ts`, `src/components/FocusNavigation.tsx`): detected when the Android app has no touch points. Adds `html.tv-mode` → bigger text, strong yellow focus ring, D-pad spatial navigation (left/right stay on the same row), auto-focus on page change.
- Clickable `.cursor-pointer` cards get `tabindex`/`role="button"` and open with Enter/OK (also improves keyboard access on the website).
- Test in a desktop browser: `https://tvtime.online/?tv=1` (arrow keys), `?tv=0` to turn off.
- Install on a TV: Settings → Device Preferences → About → Build ×7 → enable debugging → `adb connect <tv-ip>` → `npm run android:run`.
- Play Console: Release → Advanced settings → **Form factors → Android TV** (separate TV review; needs TV screenshots + banner).

## Release checklists

**Web (Vercel)**
1. `npx tsc --noEmit && npx next build`
2. Run any new SQL in `supabase/migrations/` **before** deploying code that needs it.
3. Commit as `kashivivek <kashivivek@gmail.com>` and push → Vercel deploys `main`.
4. Smoke test: login, mark watched + Undo, show page logged-out, `/calendar`, PostHog live events.

**Android (Play Console)**
1. Bump `versionCode` / `versionName` in `android/app/build.gradle` (only for native changes).
2. Off VPN: `npm run android:bundle`.
3. Upload the `.aab` → Internal testing → promote.
4. First release only: copy App signing SHA-256 → `ANDROID_SHA256_CERT_FINGERPRINTS`; privacy policy URL `https://tvtime.online/privacy`.

## Store listing images

Ready-to-upload Play Console images live in `store-assets/play/` (made-up show titles and service names on purpose — real posters/logos risk copyright rejections):

| Play Console field | File(s) | Size |
|---|---|---|
| App icon | `app-icon-512.png` | 512×512 |
| Feature graphic | `feature-graphic-1024x500.jpg` | 1024×500 |
| Phone screenshots | `phone/01…08` | 1080×1920 |
| 7-inch tablet screenshots | `tablet-7in/01…08` | 1200×1920 |
| 10-inch tablet screenshots | `tablet-10in/01…08` | 1600×2560 |
| Android TV screenshots | `tv/01…04` | 1920×1080 |
| Android TV banner | `tv/tv-banner-1280x720.png` | 1280×720 (also used in-app as `res/drawable-xhdpi/tv_banner.png`) |

To change text/layouts: edit `store-assets/templates/screens.html`, then run `sh store-assets/render.sh` (uses headless Chrome).

## Gotchas

- **Corporate network:** tvtime.online (McAfee block page), TMDB and Gradle downloads are blocked on the work network/VPN. Test the site from a phone on mobile data; build Android off VPN. SSR show pages can't be rendered locally on that network.
- **npm registry:** the machine defaults to an internal registry. Install packages with `--registry=https://registry.npmjs.org` so `package-lock.json` keeps public URLs (Vercel can't reach the internal one). Check: `grep '"resolved"' package-lock.json | grep -vc registry.npmjs.org` → `0`.
- **Secrets:** never put real values in `.env.local.example`, chat tools or online curl runners. If a secret leaks, rotate it in Vercel and redeploy.
- **Git identity:** commit with the personal account (`kashivivek@gmail.com`), never a work email.
- **New tables:** always enable RLS + add policies in a migration, or the anon key exposes them.
- **Capacitor:** `android/app/src/main/assets` and `ios/App/App/public` are generated by `cap sync` (git-ignored) — run `npm run cap:sync` before native builds.

## License

MIT
