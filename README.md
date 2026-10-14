# Kairoku — Remember every story

A personal anime tracking + journaling platform (Letterboxd × MyAnimeList × diary).
Next.js 16 · React 19 · TypeScript · Tailwind v4 · Firebase · Jikan API.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

## Anime data

Live metadata comes from the [Jikan API](https://jikan.moe) (no key needed),
proxied through `/api/jikan/[...path]` — same-origin for the browser (no CORS
failures), cached 30 min server-side, and serving stale cache on 429s/errors.
If Jikan is unreachable, the client falls back to the [Kitsu API](https://kitsu.io)
(direct browser calls, permissive CORS), then to the built-in seed catalog.
Discover shows a Live/Offline badge so the data source is always transparent.
Kitsu records use namespaced IDs (see `src/lib/kitsu.ts`) that route through
the same pages, library, and diary code paths.
Artwork goes through `/api/image?url=` (same-origin bytes with correct MIME,
branded SVG placeholder on failure) via the `SafeImage` component, so
hotlink/ORB-blocked posters never render broken.
If the provider is unreachable or rate-limited, the app falls back to the
built-in seed catalog in `src/lib/mock-data.ts` plus a `localStorage` cache —
UI development never blocks on the network.

## Firebase

`.env.local` is configured for project `kairoku-d9538` (gitignored).
Email/password + Google sign-in and Firestore sync are live:

- Firestore writes (profile, `users/{uid}/library/*`) sync best-effort.
- Analytics initializes lazily in the browser only (`initAnalytics`).
- Security rules live in `firestore.rules` — deploy with
  `firebase deploy --only firestore:rules`.
- If env vars are ever removed, the app falls back to local mode:
  everything persists in `localStorage` under `kairoku:*` keys.


## Checks

```bash
npm run lint
npm run build
```
