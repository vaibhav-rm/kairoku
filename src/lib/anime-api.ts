import type { Anime, Episode } from "@/types";
import { MOCK_ANIME, mockEpisodes } from "./mock-data";
import {
  getKitsuAnime,
  getKitsuBrowse,
  getKitsuEpisodes,
  isKitsuId,
  kitsuIdOf,
  searchKitsu,
} from "./kitsu";
// NOTE: live fetching goes through /api/jikan (same-origin proxy).
// The upstream base URL lives in src/app/api/jikan/[...path]/route.ts.

export type ProviderStatus = "jikan" | "kitsu" | "mock";

/** Raised when the provider understood us but has no such record. */
export class NotFoundError extends Error {
  constructor(message = "not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 1000 * 60 * 30;
// Negative cache: when the provider is down, don't hammer it on every
// remount/navigation — fail fast to cached/mock data for a minute, then retry.
const failedAt = new Map<string, number>();
const FAIL_TTL = 1000 * 60;
// In-flight de-dupe: two components asking for the same key at the same
// time share a single network request instead of racing each other.
const inflight = new Map<string, Promise<unknown>>();

// Jikan allows ~3 requests/second. Serialise our client calls just under
// that ceiling so a burst of rails never trips a 429.
const MIN_INTERVAL = 380;
let lastCall = 0;
async function throttle(): Promise<void> {
  const wait = Math.max(0, lastCall + MIN_INTERVAL - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`kairoku:apicache:${key}`);
    return raw ? (JSON.parse(raw).data as T) : null;
  } catch {
    return null;
  }
}
function lsSet(key: string, data: unknown) {
  try {
    localStorage.setItem(
      `kairoku:apicache:${key}`,
      JSON.stringify({ at: Date.now(), data })
    );
  } catch {}
}

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const failed = failedAt.get(key);
  if (failed && Date.now() - failed < FAIL_TTL) {
    const stale = lsGet<T>(key);
    if (stale) return stale;
    throw new Error("provider cooling down");
  }

  const task = (async () => {
    try {
      const data = await fetcher();
      failedAt.delete(key);
      cache.set(key, { at: Date.now(), data });
      lsSet(key, data);
      return data;
    } catch (e) {
      failedAt.set(key, Date.now());
      const stale = lsGet<T>(key);
      if (stale) return stale;
      throw e;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

interface JikanNamed {
  name?: string;
}

interface JikanImageSet {
  jpg?: { image_url?: string; small_image_url?: string; large_image_url?: string };
  webp?: { image_url?: string; small_image_url?: string; large_image_url?: string };
}

interface JikanAnime {
  mal_id: number;
  title?: string;
  title_english?: string | null;
  title_japanese?: string | null;
  synopsis?: string | null;
  images?: JikanImageSet;
  genres?: JikanNamed[];
  themes?: JikanNamed[];
  demographics?: JikanNamed[];
  studios?: JikanNamed[];
  year?: number | null;
  type?: string | null;
  status?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  episodes?: number | null;
  airing?: boolean;
  aired?: { from?: string | null; to?: string | null };
  broadcast?: { string?: string | null };
  trailer?: { youtube_id?: string | null };
}

interface JikanEpisode {
  episode?: number | string;
  title?: string | null;
  title_japanese?: string | null;
  synopsis?: string | null;
  aired?: string | null;
  duration?: string | number | null;
  score?: number | null;
}

interface JikanPagination {
  last_visible_page?: number;
  has_next_page?: boolean;
  items?: { count?: number; total?: number; per_page?: number };
}

interface JikanRecommendation {
  entry?: {
    mal_id: number;
    title?: string;
    images?: JikanImageSet;
  };
  // Some responses flatten the entry fields directly onto the item.
  mal_id?: number;
  title?: string;
  images?: JikanImageSet;
}

function imageUrl(images?: JikanImageSet): string {
  return (
    images?.webp?.large_image_url ||
    images?.jpg?.large_image_url ||
    images?.webp?.image_url ||
    images?.jpg?.image_url ||
    images?.jpg?.small_image_url ||
    ""
  );
}

function mapJikan(a: JikanAnime): Anime {
  const extra = [...(a.themes || []), ...(a.demographics || [])]
    .map((g) => g.name || "")
    .filter(Boolean);
  return {
    malId: a.mal_id,
    source: "jikan",
    title: a.title_english || a.title || "Unknown title",
    titleJapanese: a.title_japanese ?? undefined,
    titleEnglish: a.title_english ?? undefined,
    synopsis: a.synopsis ?? undefined,
    coverImage: imageUrl(a.images),
    bannerImage: imageUrl(a.images) || undefined,
    genres: (a.genres || []).map((g) => g.name || "").filter(Boolean),
    themes: extra,
    studios: (a.studios || []).map((s) => s.name || "").filter(Boolean),
    year: a.year ?? (a.aired?.from ? new Date(a.aired.from).getFullYear() : undefined),
    type: a.type ?? undefined,
    status: a.status ?? undefined,
    score: a.score ?? undefined,
    scoredBy: a.scored_by ?? undefined,
    rank: a.rank ?? undefined,
    popularity: a.popularity ?? undefined,
    episodes: a.episodes ?? undefined,
    airing: a.airing,
    airedFrom: a.aired?.from ?? undefined,
    airedTo: a.aired?.to ?? undefined,
    broadcast: a.broadcast?.string ?? undefined,
    trailer: a.trailer?.youtube_id
      ? `https://www.youtube.com/watch?v=${a.trailer.youtube_id}`
      : undefined,
  };
}

/** Low-level same-origin proxy call (cached server-side, stale-on-429). */
export async function jikan<T>(path: string): Promise<T> {
  await throttle();
  const r = await fetch(`/api/jikan${path}`);
  if (r.status === 404) throw new NotFoundError(`proxy 404 ${path}`);
  if (!r.ok) throw new Error(`proxy ${r.status}`);
  return (await r.json()) as T;
}

const pageQuery = (page: number) => (page > 1 ? `&page=${page}` : "");

export async function searchAnime(q: string): Promise<Anime[]> {
  if (!q.trim()) return [];
  const mock = MOCK_ANIME.filter((a) =>
    `${a.title} ${a.titleJapanese} ${a.genres.join(" ")}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );
  try {
    const json = await cached(`search:${q.toLowerCase()}`, () =>
      jikan<{ data?: JikanAnime[] }>(
        `/anime?q=${encodeURIComponent(q)}&limit=12&sfw=true`
      )
    );
    const list = (json.data || []).map(mapJikan);
    if (list.length) return list;
    throw new Error("empty");
  } catch {
    try {
      const kitsu = await searchKitsu(q);
      if (kitsu.length) return kitsu;
    } catch {}
    return mock.length ? mock : MOCK_ANIME.slice(0, 6);
  }
}

export async function getAnime(malId: number): Promise<Anime | null> {
  if (isKitsuId(malId)) {
    try {
      return await getKitsuAnime(kitsuIdOf(malId));
    } catch {
      return null;
    }
  }
  const mock = MOCK_ANIME.find((a) => a.malId === malId);
  try {
    const json = await cached(`anime:${malId}`, () =>
      jikan<{ data?: JikanAnime }>(`/anime/${malId}/full`)
    );
    if (json?.data) return mapJikan(json.data);
    return mock ?? null;
  } catch {
    return mock ?? null;
  }
}

export interface EpisodePage {
  episodes: Episode[];
  hasNext: boolean;
  lastPage: number;
  page: number;
}

function mapEpisode(e: JikanEpisode): Episode {
  return {
    number:
      typeof e.episode === "string"
        ? parseInt(e.episode, 10) || 0
        : e.episode ?? 0,
    title: e.title || undefined,
    titleJapanese: e.title_japanese || undefined,
    synopsis: e.synopsis || undefined,
    airDate: e.aired || undefined,
    runtime: e.duration ? parseInt(String(e.duration), 10) || 24 : 24,
    score: e.score ?? undefined,
  };
}

export async function getAnimeEpisodes(
  malId: number,
  page = 1
): Promise<EpisodePage> {
  if (isKitsuId(malId)) {
    try {
      const eps = await getKitsuEpisodes(kitsuIdOf(malId));
      return { episodes: eps, hasNext: false, lastPage: 1, page: 1 };
    } catch {
      return { episodes: [], hasNext: false, lastPage: 1, page: 1 };
    }
  }
  const mock = MOCK_ANIME.find((a) => a.malId === malId);
  try {
    const json = await cached(`eps:${malId}:${page}`, () =>
      jikan<{ data?: JikanEpisode[]; pagination?: JikanPagination }>(
        `/anime/${malId}/episodes?page=${page}`
      )
    );
    const eps = (json.data || []).map(mapEpisode).filter((e) => e.number > 0);
    if (eps.length) {
      return {
        episodes: eps,
        hasNext: !!json.pagination?.has_next_page,
        lastPage: json.pagination?.last_visible_page ?? page,
        page,
      };
    }
    throw new Error("empty");
  } catch {
    if (mock) {
      const all = mockEpisodes(mock);
      // Mock episodes are served as a single virtual page.
      return { episodes: all, hasNext: false, lastPage: 1, page };
    }
    return { episodes: [], hasNext: false, lastPage: 1, page };
  }
}

/**
 * Fetch every episode of a series (walking Jikan's pagination) up to a
 * safety cap — long-runners like One Piece would otherwise stop at 100.
 */
export async function getAllEpisodes(
  malId: number,
  maxEpisodes = 1500
): Promise<Episode[]> {
  const first = await getAnimeEpisodes(malId, 1);
  const eps = [...first.episodes];
  let page = 1;
  while (first.hasNext && page < first.lastPage && eps.length < maxEpisodes) {
    page += 1;
    const next = await getAnimeEpisodes(malId, page);
    if (!next.episodes.length) break;
    eps.push(...next.episodes);
    if (!next.hasNext) break;
  }
  // De-dupe + order defensively (providers occasionally repeat an entry).
  const seen = new Map<number, Episode>();
  for (const e of eps) if (!seen.has(e.number)) seen.set(e.number, e);
  return [...seen.values()].sort((a, b) => a.number - b.number);
}

/** Jikan "similar anime" list for a title (partial records; hydrated lazily). */
export async function getAnimeRecommendations(
  malId: number,
  limit = 12
): Promise<Anime[]> {
  if (isKitsuId(malId) || !malId) return [];
  try {
    const json = await cached(`recs:${malId}`, () =>
      jikan<{ data?: JikanRecommendation[] }>(
        `/anime/${malId}/recommendations`
      )
    );
    const seen = new Set<number>();
    const out: Anime[] = [];
    for (const item of json.data || []) {
      const e = item.entry ?? item;
      const id = e.mal_id;
      if (!id || id === malId || seen.has(id)) continue;
      seen.add(id);
      out.push({
        malId: id,
        source: "jikan",
        title: e.title || "Unknown title",
        coverImage: imageUrl(e.images),
        bannerImage: imageUrl(e.images) || undefined,
        genres: [],
        studios: [],
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

export interface BrowseLists {
  trending: Anime[];
  airing: Anime[];
  top: Anime[];
  live: ProviderStatus;
}

async function jikanBrowse(): Promise<Omit<BrowseLists, "live">> {
  const [season, top] = await Promise.all([
    cached("season-now", () =>
      jikan<{ data?: JikanAnime[] }>("/seasons/now?limit=24&sfw=true")
    ),
    cached("top-anime", () =>
      jikan<{ data?: JikanAnime[] }>("/top/anime?limit=24&sfw=true")
    ),
  ]);
  const seasonList = (season.data || []).map(mapJikan);
  const topList = (top.data || []).map(mapJikan);
  const airing = seasonList.filter((a) => a.airing !== false);
  return {
    trending: seasonList.slice(0, 12),
    airing: airing.length ? airing : seasonList,
    top: topList,
  };
}

export async function getBrowseLists(): Promise<BrowseLists> {
  try {
    return { ...(await jikanBrowse()), live: "jikan" };
  } catch {
    try {
      const k = await getKitsuBrowse();
      if (k.trending.length) return { ...k, live: "kitsu" };
      throw new Error("empty");
    } catch {
      return {
        trending: MOCK_ANIME.slice(0, 6),
        airing: MOCK_ANIME.filter((a) => a.airing),
        top: [...MOCK_ANIME].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
        live: "mock",
      };
    }
  }
}

/** Top anime, optionally paged — used as a recommendation candidate pool. */
export async function getTopAnime(page = 1, limit = 24): Promise<Anime[]> {
  try {
    const json = await cached(`top-anime:${page}`, () =>
      jikan<{ data?: JikanAnime[] }>(
        `/top/anime?limit=${limit}&sfw=true${pageQuery(page)}`
      )
    );
    return (json.data || []).map(mapJikan);
  } catch {
    return page === 1
      ? [...MOCK_ANIME].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      : [];
  }
}

/** Currently airing / this season's anime. */
export async function getSeasonAnime(): Promise<Anime[]> {
  try {
    const json = await cached(`season-now`, () =>
      jikan<{ data?: JikanAnime[] }>("/seasons/now?limit=24&sfw=true")
    );
    return (json.data || []).map(mapJikan);
  } catch {
    return MOCK_ANIME.filter((a) => a.airing);
  }
}

/** Genre names → MAL genre IDs, cached for the session. */
export async function getGenreIndex(): Promise<Map<string, number>> {
  try {
    const json = await cached("genres", () =>
      jikan<{ data?: { mal_id: number; name?: string }[] }>("/genres/anime")
    );
    const map = new Map<string, number>();
    for (const g of json.data || [])
      if (g.name) map.set(g.name.toLowerCase(), g.mal_id);
    return map;
  } catch {
    return new Map();
  }
}

/** Highest-rated anime within a genre (by MAL genre id). */
export async function getAnimeByGenre(
  genreId: number,
  limit = 18
): Promise<Anime[]> {
  try {
    const json = await cached(`genre:${genreId}`, () =>
      jikan<{ data?: JikanAnime[] }>(
        `/anime?genres=${genreId}&order_by=score&sort=desc&limit=${limit}&sfw=true&min_score=6.5`
      )
    );
    return (json.data || []).map(mapJikan);
  } catch {
    return [];
  }
}

export function mockById(malId: number): Anime | undefined {
  return MOCK_ANIME.find((a) => a.malId === malId);
}
