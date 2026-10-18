# Kairoku — Remember every story

A personal anime tracking, rating, and recommendation platform
(Letterboxd × MyAnimeList) with a live airing schedule.
Next.js 16 · React 19 · TypeScript · Tailwind v4 · Firebase · Jikan API.

## Features

- **Tracking** — a five-state library (watching / completed / plan to watch /
  paused / dropped) with per-series progress, sorting, and a dedicated watchlist.
- **Episode tracking** — tick episodes watched directly from a series page,
  a persistent watched-set that survives progress changes, "up next" episode
  jumps, and prev/next episode navigation on the episode page. Long-runners
  page through Jikan so One Piece isn't capped at 100 episodes.
- **Ratings** — half-star series ratings plus separate per-episode ratings,
  each able to carry an optional private **note** stored with the rating and
  surfaced in the library and profile statistics.
- **Lists** — create public or private collections, add titles straight from any
  anime page or from your library, and remove/reorder-free manage them. Lists
  keep a snapshot of their titles so they survive library deletions.
- **Recommendations** — a client-side taste engine (`src/lib/recommend.ts`)
  that scores candidates against genre/studio/decade affinities derived from
  your statuses, ratings, reviews, and favourite genres. It blends MAL's
  own similarity graph ("Because you liked X"), top titles within your top
  genres, this season's airing shows, and all-time top anime. See
  `/recommendations`, plus rails on Home and Discover.
- **Upcoming & alerts** — `/upcoming` lists the next episodes of every airing
  title you're watching, in release order, with a live countdown and the exact
  air date/time in your timezone. New episodes of watched airing shows raise an
  in-app notification (`src/lib/airing.ts` resolves them from real episode air
  dates).
- **Reviews** — publish public reviews with spoiler gating and likes.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Firebase web config
npm run dev                  # http://localhost:3000
```

New accounts (email or Google) pick a username during onboarding; that handle
is reserved in the `usernames` registry and stored on the profile.

## Anime data

Live metadata comes from the [Jikan API](https://jikan.moe) (no key needed),
proxied through `/api/jikan/...` — a Cloudflare Pages Function
(`functions/api/jikan/[[path]].ts`, same-origin for the browser so there are no
CORS failures), cached 30 min per isolate, and serving stale cache on 429s/errors.
If Jikan is unreachable, the client falls back to the [Kitsu API](https://kitsu.io)
(direct browser calls, permissive CORS), then to the built-in seed catalog.
Discover shows a Live/Offline badge so the data source is always transparent.
Kitsu records use namespaced IDs (see `src/lib/kitsu.ts`) that route through
the same pages and library code paths.
Artwork goes through `/api/image?url=` (a Pages Function: same-origin bytes with
correct MIME, branded SVG placeholder on failure) via the `SafeImage` component,
so hotlink/ORB-blocked posters never render broken.
If the provider is unreachable or rate-limited, the app falls back to the
built-in seed catalog in `src/lib/mock-data.ts` plus a `localStorage` cache —
UI development never blocks on the network.

Proxy details: real 404s pass straight through (so a missing title is
distinguishable from a dead provider), responses carry
`stale-while-revalidate`, and the client-side loader de-dupes concurrent
requests for the same key and self-throttles to stay under Jikan's 3 req/s
limit. Kitsu episode lists paginate too, so the fallback path is complete.

### Client cache

Every provider response is cached in `localStorage` (`kairoku:apicache:v2:*`)
with a timestamp, so a reload or revisit reuses what's already on the device
instead of calling the API again — only genuinely new keys (a fresh search, an
unseen page/episode/genre) hit the network. Freshness is per-key and never
exceeds a day:

| Data | TTL |
| --- | --- |
| Episode lists, this-season browse | 3 hours |
| Search results (default) | 8 hours |
| Anime detail, genres, top lists, recommendations | 24 hours |

Expired entries are pruned on write, the store is capped at 150 entries
(oldest evicted first), a quota error evicts and retries, and stale copies are
still served while the provider is down. Settings → **Cached anime data** →
*Clear cached anime data* wipes it (`clearApiCache()` in `src/lib/anime-api.ts`).

## Firebase

`.env.local` is configured for project `kairoku-d9538` (gitignored).
Email/password + Google sign-in and Firestore sync are live:

- Firestore mirrors user-authored data best-effort, debounced and local-first:
  the profile, `users/{uid}/library/{animeId}`, `users/{uid}/episodes/{animeId}`
  (per-episode ratings/notes + the watched set), `users/{uid}/lists/{listId}`,
  and public `animeReviews/{reviewId}`. On sign-in the device backfills anything
  it's missing from Firestore; local edits always win.
- Analytics initializes lazily in the browser only (`initAnalytics`).
- Security rules live in `firestore.rules` — deploy with
  `firebase deploy --only firestore:rules`.
- Add your deployed origin (e.g. `kairoku.pages.dev`, plus any custom domain)
  to Firebase Auth → Settings → **Authorized domains**, or Google sign-in
  popups are blocked.
- If env vars are ever removed, the app falls back to local mode:
  everything persists in `localStorage` under `kairoku:*` keys.


## Deploying to Cloudflare Pages

Kairoku builds to a **static export** (`out/`) with its API routes implemented
as **Pages Functions** (`functions/`). No adapter is needed.

Pages project settings:

| Setting | Value |
| --- | --- |
| Build command | `npx next build` |
| Build output directory | `out` |

Then add the Firebase web config as **build-time** environment variables
(Production *and* Preview). They are `NEXT_PUBLIC_*`, so Next inlines them at
build time — without them the deployed app runs in local/offline mode, with no
auth and no Firestore sync:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

`public/_routes.json` scopes Functions to `/api/*`, so every other request is
served straight from the static assets. Preview the whole thing locally
(static + Functions) with `npm run preview`.

### URLs

`output: "export"` can't emit infinite dynamic routes, so detail pages read
their id from a query param instead of a path segment:

| Page | URL |
| --- | --- |
| Anime | `/anime/?a=21-one-piece` |
| Episode | `/anime/episode/?a=21-one-piece&ep=5` |
| List | `/lists/view/?id=<listId>` |
| Profile | `/u/?u=<username>` |

Always build these links with the helpers in `src/lib/routes.ts`.

## Checks

```bash
npm run lint
npm run build      # static export → out/
npm run preview    # wrangler pages dev (out/ + /api functions)
```
