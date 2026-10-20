import type { Anime, Episode } from "@/types";
import { MOCK_ANIME, mockEpisodes } from "./mock-data";
import {
  getKitsuAnime,
  getKitsuAiring,
  getKitsuBrowse,
  getKitsuByCategory,
  getKitsuCategories,
  getKitsuEpisodePage,
  getKitsuTop,
  isKitsuId,
  kitsuIdOf,
  searchKitsu,
} from "./kitsu";

// Live metadata comes straight from Kitsu's browser-friendly JSON:API (see
// kitsu.ts). Everything here adds caching, pagination and seed-data fallbacks.

export type ProviderStatus = "kitsu" | "mock";

const cache = new Map<string, { at: number; data: unknown }>();
// Persistent (localStorage-backed) response cache so a reload or navigation
// doesn't re-hit the provider for data we already have. Freshness is per-key
// and never exceeds a day.
const TTL_SHORT = 1000 * 60 * 60 * 3; // 3 hours — airing & episode lists
const TTL = 1000 * 60 * 60 * 8; // 8 hours — default (e.g. search results)
const TTL_LONG = 1000 * 60 * 60 * 24; // 24 hours — near-static metadata
// v3: the provider switched from Jikan to Kitsu, so older entries are stale.
const CACHE_PREFIX = "kairoku:apicache:v3:";
const LEGACY_PREFIX = "kairoku:apicache:";
const MAX_ENTRIES = 150;
const EPISODES_PER_PAGE = 20;
// Negative cache: when the provider is down, don't hammer it on every
// remount/navigation — fail fast to cached/mock data for a minute, then retry.
const failedAt = new Map<string, number>();
const FAIL_TTL = 1000 * 60;
// In-flight de-dupe: two components asking for the same key at the same
// time share a single network request instead of racing each other.
const inflight = new Map<string, Promise<unknown>>();

/** How long a given cache key stays fresh. */
function ttlFor(key: string): number {
  // Airing/episode data moves as episodes release — keep it short.
  if (key.startsWith("eps:") || key.startsWith("airing")) return TTL_SHORT;
  // Near-static metadata is safe for a full day.
  if (
    key.startsWith("anime:") ||
    key.startsWith("categories") ||
    key.startsWith("genre:") ||
    key.startsWith("top-anime") ||
    key.startsWith("recs:")
  )
    return TTL_LONG;
  // Search queries and anything else.
  return TTL;
}

let lastPrune = 0;
/** Drop expired entries, migrate away the old format, and cap the entry count. */
function pruneCache() {
  if (typeof window === "undefined") return;
  try {
    const entries: { k: string; at: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(LEGACY_PREFIX) && !k.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(k); // obsolete cache format — never read again
        i--;
        continue;
      }
      if (!k.startsWith(CACHE_PREFIX)) continue;
      let at = 0;
      try {
        at = (JSON.parse(localStorage.getItem(k) || "") as { at?: number }).at || 0;
      } catch {
        at = 0;
      }
      entries.push({ k, at });
    }
    const now = Date.now();
    const live: { k: string; at: number }[] = [];
    for (const e of entries) {
      if (now - e.at >= ttlFor(e.k.slice(CACHE_PREFIX.length))) {
        localStorage.removeItem(e.k);
      } else {
        live.push(e);
      }
    }
    if (live.length > MAX_ENTRIES) {
      live.sort((a, b) => a.at - b.at);
      for (const e of live.slice(0, live.length - MAX_ENTRIES)) localStorage.removeItem(e.k);
    }
  } catch {}
}

function maybePrune() {
  if (Date.now() - lastPrune < 60_000) return;
  lastPrune = Date.now();
  pruneCache();
}

function lsGet<T>(key: string): { at: number; data: T } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; data?: T };
    if (!parsed || typeof parsed.at !== "number") return null;
    return { at: parsed.at, data: parsed.data as T };
  } catch {
    return null;
  }
}
function lsSet(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  const write = () =>
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  try {
    write();
  } catch {
    // Storage full — evict the oldest entries and try once more.
    pruneCache();
    try {
      write();
    } catch {}
  }
  maybePrune();
}

/** Remove every cached provider response. Returns how many entries were dropped. */
export function clearApiCache(): number {
  if (typeof window === "undefined") return 0;
  let removed = 0;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LEGACY_PREFIX)) {
        localStorage.removeItem(k);
        removed++;
      }
    }
    cache.clear();
    failedAt.clear();
  } catch {}
  return removed;
}

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const ttl = ttlFor(key);

  // Fast path: an in-memory entry that's still fresh.
  const hit = cache.get(key);
  if (hit && now - hit.at < ttl) return hit.data as T;

  // Persistent hit (survives reloads/navigation) — hydrate memory and return
  // without touching the network.
  const stored = lsGet<T>(key);
  if (stored && now - stored.at < ttl) {
    cache.set(key, stored);
    return stored.data;
  }

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const failed = failedAt.get(key);
  if (failed && now - failed < FAIL_TTL) {
    if (stored) return stored.data; // any stale copy beats nothing
    throw new Error("provider cooling down");
  }

  const task = (async () => {
    try {
      const data = await fetcher();
      failedAt.delete(key);
      const entry = { at: Date.now(), data };
      cache.set(key, entry);
      lsSet(key, data);
      return data;
    } catch (e) {
      failedAt.set(key, Date.now());
      if (stored) return stored.data;
      throw e;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

export async function searchAnime(q: string): Promise<Anime[]> {
  if (!q.trim()) return [];
  const mock = MOCK_ANIME.filter((a) =>
    `${a.title} ${a.titleJapanese} ${a.genres.join(" ")}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );
  try {
    const list = await cached(`search:${q.toLowerCase()}`, () => searchKitsu(q));
    if (list.length) return list;
  } catch {}
  return mock.length ? mock : MOCK_ANIME.slice(0, 6);
}

export async function getAnime(animeId: number): Promise<Anime | null> {
  const mock = MOCK_ANIME.find((a) => a.animeId === animeId);
  if (isKitsuId(animeId)) {
    try {
      const anime = await cached(`anime:${animeId}`, () =>
        getKitsuAnime(kitsuIdOf(animeId))
      );
      if (anime) return anime;
    } catch {}
  }
  return mock ?? null;
}

export interface EpisodePage {
  episodes: Episode[];
  hasNext: boolean;
  lastPage: number;
  page: number;
}

export async function getAnimeEpisodes(
  animeId: number,
  page = 1
): Promise<EpisodePage> {
  if (isKitsuId(animeId)) {
    try {
      const { episodes, total } = await cached(`eps:${animeId}:${page}`, () =>
        getKitsuEpisodePage(kitsuIdOf(animeId), page, EPISODES_PER_PAGE)
      );
      const lastPage = Math.max(1, Math.ceil(total / EPISODES_PER_PAGE));
      return { episodes, hasNext: page < lastPage, lastPage, page };
    } catch {}
  }
  const mock = MOCK_ANIME.find((a) => a.animeId === animeId);
  if (mock) {
    return { episodes: mockEpisodes(mock), hasNext: false, lastPage: 1, page };
  }
  return { episodes: [], hasNext: false, lastPage: 1, page };
}

/**
 * Fetch every episode of a series by walking Kitsu's pagination, up to a
 * safety cap — long-runners like One Piece have over a thousand episodes.
 */
export async function getAllEpisodes(
  animeId: number,
  maxEpisodes = 1500
): Promise<Episode[]> {
  const first = await getAnimeEpisodes(animeId, 1);
  const eps = [...first.episodes];
  let page = 1;
  while (first.hasNext && page < first.lastPage && eps.length < maxEpisodes) {
    page += 1;
    const next = await getAnimeEpisodes(animeId, page);
    if (!next.episodes.length) break;
    eps.push(...next.episodes);
    if (!next.hasNext) break;
  }
  // De-dupe + order defensively (providers occasionally repeat an entry).
  const seen = new Map<number, Episode>();
  for (const e of eps) if (!seen.has(e.number)) seen.set(e.number, e);
  return [...seen.values()].sort((a, b) => a.number - b.number);
}

/** Highest-rated titles in the same genre as `animeId` (Kitsu has no graph API). */
export async function getAnimeRecommendations(
  animeId: number,
  limit = 12
): Promise<Anime[]> {
  const anime = await getAnime(animeId);
  const genre = anime?.genres[0];
  if (!genre) return [];
  const slug = (await getGenreIndex()).get(genre.toLowerCase()) ?? slugify(genre);
  if (!slug) return [];
  const list = await getAnimeByGenre(slug, limit + 1);
  return list.filter((a) => a.animeId !== animeId).slice(0, limit);
}

export interface BrowseLists {
  trending: Anime[];
  airing: Anime[];
  top: Anime[];
  live: ProviderStatus;
}

export async function getBrowseLists(): Promise<BrowseLists> {
  try {
    const lists = await getKitsuBrowse();
    if (lists.trending.length || lists.airing.length || lists.top.length) {
      return { ...lists, live: "kitsu" };
    }
  } catch {}
  return {
    trending: MOCK_ANIME.slice(0, 6),
    airing: MOCK_ANIME.filter((a) => a.airing),
    top: [...MOCK_ANIME].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    live: "mock",
  };
}

/** Top anime, optionally paged — used as a recommendation candidate pool. */
export async function getTopAnime(page = 1, limit = 20): Promise<Anime[]> {
  try {
    const list = await cached(`top-anime:${page}:${limit}`, () =>
      getKitsuTop(page, limit)
    );
    if (list.length || page > 1) return list;
  } catch {}
  return page === 1
    ? [...MOCK_ANIME].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    : [];
}

/** Currently airing / this season's anime. */
export async function getSeasonAnime(): Promise<Anime[]> {
  try {
    const list = await cached("airing", () => getKitsuAiring(20));
    if (list.length) return list;
  } catch {}
  return MOCK_ANIME.filter((a) => a.airing);
}

/** Genre names → Kitsu category slugs, cached for the day. */
export async function getGenreIndex(): Promise<Map<string, string>> {
  try {
    const categories = await cached("categories", () => getKitsuCategories());
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.title.toLowerCase(), c.slug);
      map.set(c.slug, c.slug);
    }
    if (map.size) return map;
  } catch {}
  return new Map();
}

/** Highest-rated anime within a genre (by Kitsu category slug). */
export async function getAnimeByGenre(
  slug: string,
  limit = 18
): Promise<Anime[]> {
  try {
    const list = await cached(`genre:${slug}:${limit}`, () =>
      getKitsuByCategory(slug, limit)
    );
    if (list.length) return list;
  } catch {}
  return [];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function mockById(animeId: number): Anime | undefined {
  return MOCK_ANIME.find((a) => a.animeId === animeId);
}
