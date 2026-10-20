# Kairoku — Remember every story

A personal anime tracking, rating, and recommendation platform
(a Letterboxd-style journal for anime) with a live airing schedule.
Next.js 16 · React 19 · TypeScript · Tailwind v4 · Firebase · Kitsu API.

## Features

- **Tracking** — a five-state library (watching / completed / plan to watch /
  paused / dropped) with per-series progress, sorting, and a dedicated watchlist.
- **Episode tracking** — tick episodes watched directly from a series page,
  a persistent watched-set that survives progress changes, "up next" episode
  jumps, and prev/next episode navigation on the episode page. Long-runners
  page through Kitsu's 20-per-page episode API, so One Piece's 1,400 episodes
  stay reachable.
- **Ratings** — one half-star rating per series. Marking a series completed
  prompts for a rating, and ratings feed the recommendation engine.
- **Franchise grouping** — search returns the first season only; its series page
  has a switcher for every sequel, film, OVA and side story, each with its own
  progress, status and rating. Related entries come from Kitsu's relationship
  graph (`src/lib/kitsu.ts`).
- **Lists** — create public or private collections, add titles straight from any
  anime page or from your library, and remove/reorder-free manage them. Lists
  keep a snapshot of their titles so they survive library deletions.
- **Recommendations** — a client-side taste engine (`src/lib/recommend.ts`)
  that scores candidates against genre/studio/decade affinities derived from
  your statuses, ratings, and favourite genres. It blends same-genre
  titles ("Because you liked X"), top titles within your top genres, this
  season's airing shows, and all-time top anime. See
  `/recommendations`, plus rails on Home and Discover.
- **Upcoming & alerts** — `/upcoming` lists the next episodes of every airing
  title you're watching, in release order, with a live countdown and the exact
  air date/time in your timezone. A new season of a franchise you've started is
  included even before you add that season to your library. New episodes of
  watched airing shows raise an in-app notification (`src/lib/airing.ts`
  resolves them from real episode air dates).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Firebase web config
npm run dev                  # http://localhost:3000
```

New accounts (email or Google) pick a username during onboarding; that handle
is reserved in the `usernames` registry and stored on the profile.

## Anime data

Live metadata comes from the [Kitsu API](https://kitsu.io) (no key needed).
It is a public JSON:API with permissive CORS, so the browser calls it directly —
there is no metadata proxy Function to run or rate-limit against.
Every record is mapped into the shared `Anime` shape in `src/lib/kitsu.ts`, and
Kitsu ids are offset (`+9000000`) to form our own stable id space — the seed
catalogue, links and saved records all use it. Discover shows a Live/Offline
badge so the data source is always transparent.

Kitsu caps every page at 20 records, so anime lists, episodes and search all
paginate. The series page pages through its episode list, and the airing
scheduler jumps straight to the last episode page to find the next unaired
episode of a long-runner. Adult titles (`R18+`/`RX`) are
filtered out of search and browse.

Artwork goes through `/api/image?url=` (a Pages Function: same-origin bytes with
correct MIME, branded SVG placeholder on failure) via the `SafeImage` component,
so hotlink/ORB-blocked posters never render broken.
If the provider is unreachable, the app falls back to the built-in seed catalog
in `src/lib/mock-data.ts` plus a `localStorage` cache — UI development never
blocks on the network.

The client-side loader de-dupes concurrent requests for the same key, keeps a
short negative cache so a failing provider isn't hammered on every navigation,
and serves stale copies while it recovers.

### Client cache

Every provider response is cached in `localStorage` (`kairoku:apicache:v3:*`)
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
  (the watched set), and `users/{uid}/lists/{listId}`. On sign-in the device
  backfills anything it's missing from Firestore; local edits always win.
- Analytics initializes lazily in the browser only (`initAnalytics`).
- Security rules live in `firestore.rules` — deploy with
  `firebase deploy --only firestore:rules`.
- Add your deployed origin (e.g. `kairoku.pages.dev`, plus any custom domain)
  to Firebase Auth → Settings → **Authorized domains**, or Google sign-in
  popups open and close immediately with `auth/unauthorized-domain`. Preview
  deployments (`<hash>.kairoku.pages.dev`) count as separate origins and must
  be added individually — a custom domain avoids that. `localhost` is
  authorized by default.
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
| Anime | `/anime/?a=9000012-one-piece` |
| Episode | `/anime/episode/?a=9000012-one-piece&ep=5` |
| List | `/lists/view/?id=<listId>` |
| Profile | `/u/?u=<username>` |

Always build these links with the helpers in `src/lib/routes.ts`.

## Checks

```bash
npm run lint
npm run build      # static export → out/
npm run preview    # wrangler pages dev (out/ + /api functions)
```
