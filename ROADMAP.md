# TTT Product Roadmap

Pick items by ID (e.g. "let's do R3"). Status: Todo / In progress / Done.
Goal for the next weeks: **more sign-ups** (landing → sign-up conversion) and **more weekly active users** (retention).

## Now: conversion (next week's run)

| ID | Item | Why | Effort | Status |
|---|---|---|---|---|
| R1 | **Google sign-in** (Supabase OAuth) on login/signup + app | Removing the password step is the biggest sign-up lift | S | Done (enable Google provider in Supabase) |
| R2 | **"Pick 3 shows" onboarding** right after sign-up (poster grid of trending/popular) | Users reach the "aha" moment (a filled dashboard) in 10 seconds | M | Done (/welcome) |
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

## Trust, legal & compliance (do C1-C5 before growth pushes)

Not legal advice: engineering review of common risks. Get a one-hour review from a privacy/tech lawyer before scaling ads.

| ID | Item | Risk if skipped | Effort | Status |
|---|---|---|---|---|
| C1 | **EU/UK cookie consent for ads**: turn on Google's certified consent message (AdSense > Privacy & messaging > European regulations); load PostHog only after consent in EEA/UK (or cookieless mode) | Google requires a certified CMP for EEA/UK/CH ads; GDPR/ePrivacy complaints | S | Code done (EU analytics store nothing on device); AdSense EU message: owner to enable |
| C2 | **Brand / trademark**: "TV Time" is Whip Media's trademark. Move public branding to **TTT** (site title, meta, store listing, emails) and plan a domain migration | Takedown or Play Store removal for impersonation; most likely legal letter we'd get | M | Deferred (keep domain) |
| C3 | **TMDB commercial use**: site shows ads, so confirm TMDB terms / request a commercial license | TMDB can revoke the API key (app stops working) | S | Revisit before ads go live |
| C4 | **Sign-up consent + age gate**: "I'm 16 or older and agree to the Terms and Privacy Policy" checkbox; minimum age 16 (covers GDPR's highest digital-consent age) in Terms/Privacy; Play target audience 16+ | COPPA/GDPR child-data exposure | S | Done (sign-up checkbox, TermsGate for existing/Google users; Play target audience: owner) |
| C5 | **Privacy policy update**: data controller + contact, legal bases (GDPR), international transfers, Firebase push + local reminders, Wikidata lookups (no personal data), CCPA/CPRA "sale/share" note for ad personalization + opt-out link, retention periods | Regulator/Play "Data safety" mismatch | S | Done (Oct 24) |
| C6 | **Terms update**: governing law, liability cap, termination, copyright/DMCA takedown contact, UGC license, no-warranty for streaming links | Weak position in any dispute | S | Done (user responsibility, indemnity, illegal content, liability cap) |
| C7 | **Hero image**: replace the AI collage of real film posters with an original or licensed image | Copyright complaint, AdSense policy flag | S | Won't do (owner keeps image) |
| C8 | **Block user** + faster moderation for comments (report already exists) | Play UGC policy requirement | M | Todo |
| C9 | **Email compliance**: one-click unsubscribe link + sender address in alert/digest emails | CAN-SPAM / GDPR, Gmail bulk-sender rules | S | Todo |
| C10 | **Self-serve data export** (JSON/CSV of history, ratings, lists) | GDPR portability requests by email | M | Todo |
| C11 | **Business setup**: run TTT under an LLC (limits personal liability), separate bank account for AdSense income | Personal liability | M | Deferred |
| C12 | **Accessibility pass** (labels, contrast, keyboard) on home, sign-up, dashboard | ADA web-accessibility demand letters (US) | M | Todo |

Age-verification laws (e.g. US state "app store accountability" acts) mainly put the duty on Apple/Google; apps without mature content mostly need to honour the store's age signals. Revisit if we add chat/DMs or mature content.

## Recently shipped (Oct 2026)

- Self-service email change (Profile > Email > Change; password + double entry; data stays on the account)
- Google Play launch (Android phone, tablet, Android TV), packaged app with self-hosted live updates
- Where to Watch opens the streaming app on the exact title (Wikidata IDs + direct app intents)
- Google TV "Continue watching" row, "Finished it?" reminders
- New marketing home page with trending posters and Google Play badge
- What's New v6
