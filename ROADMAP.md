# TTT Product Roadmap

Pick items by ID (e.g. "let's do R3"). Status: Todo / In progress / Done.
Goal for the next weeks: **more sign-ups** (landing → sign-up conversion) and **more weekly active users** (retention).

## Now: conversion (next week's run)

| ID | Item | Why | Effort | Status |
|---|---|---|---|---|
| R1 | **Google sign-in** (Supabase OAuth) on login/signup + app | Removing the password step is the biggest sign-up lift | S | Todo |
| R2 | **"Pick 3 shows" onboarding** right after sign-up (poster grid of trending/popular) | Users reach the "aha" moment (a filled dashboard) in 10 seconds | M | Todo |
| R3 | **Track before sign-up**: "+ Track" on public show/movie pages saves the intent, asks to sign up, then completes it | Sign-up at the moment of intent converts far better | S | Todo |
| R4 | **Home page hero image / visuals**: generated poster collage in hero (`public/images/hero-posters.jpg`, dark overlay). Next: swap for a licensed/no-text image, A/B the headline | First impression for every new visitor | S | In progress |
| R5 | **Funnel dashboard in PostHog**: home → sign-up click → sign-up → first track → active day 7 | Know which step leaks before optimising | S | Todo |

## Next: growth loops

| ID | Item | Why | Effort | Status |
|---|---|---|---|---|
| R6 | **Weekly email digest** ("3 new episodes for you this week", Resend) | Brings users back weekly; cheapest retention lever | M | Todo |
| R7 | **Play Store review prompt** after 10th watched episode (in-app review API) | Ratings drive Play Store ranking and installs | S | Todo |
| R8 | **"Share your week" card** + promote the year-in-TV recap in December | Free word-of-mouth from happy users | M | Todo |
| R9 | **Invite friends / see what friends watch** | Social = retention + invites | L | Todo |
| R10 | **Play listing refresh**: screenshots lead with streaming deep links, Google TV row, reminders; new short description | Store conversion | S | Todo |

## Later: SEO (slow, compounding, also helps AdSense)

| ID | Item | Why | Effort | Status |
|---|---|---|---|---|
| R11 | Show pages: **"Where to watch X"** and **"Next episode date / release schedule"** sections | High-volume searches we can answer | M | Todo |
| R12 | Public **"New episodes this week"** page | Fresh content weekly, shareable | M | Todo |
| R13 | **Genre / service pages** ("Best new shows on Netflix", "Top sci-fi series") | Long-tail search traffic | M | Todo |

## Product depth

| ID | Item | Why | Effort | Status |
|---|---|---|---|---|
| R14 | iOS app (needs Apple Developer account) | Half the phone market | L | Todo |
| R15 | Netflix viewing-history import (CSV) | Fills history without manual marking | M | Todo |
| R16 | Trakt sync | Power users who scrobble from Plex/Kodi | M | Todo |
| R17 | Custom lists UI polish + public shareable lists | Discovery + sharing | M | Todo |

## Recently shipped (Oct 2026)

- Google Play launch (Android phone, tablet, Android TV), packaged app with self-hosted live updates
- Where to Watch opens the streaming app on the exact title (Wikidata IDs + direct app intents)
- Google TV "Continue watching" row, "Finished it?" reminders
- New marketing home page with trending posters and Google Play badge
- What's New v6
