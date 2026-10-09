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
const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 1000 * 60 * 30;
// Negative cache: when the provider is down, don't hammer it on every
// remount/navigation — fail fast to mock data for a minute, then retry.
const failedAt = new Map<string, number>();
const FAIL_TTL = 1000 * 60;

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;
  const failed = failedAt.get(key);
  if (failed && Date.now() - failed < FAIL_TTL) throw new Error("provider cooling down");
  try {
    const data = await fetcher();
    failedAt.delete(key);
    cache.set(key, { at: Date.now(), data });
    try {
      localStorage.setItem(
        `kairoku:apicache:${key}`,
        JSON.stringify({ at: Date.now(), data })
      );
    } catch {}
    return data;
  } catch (e) {
    failedAt.set(key, Date.now());
    try {
      const raw = localStorage.getItem(`kairoku:apicache:${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.data as T;
      }
    } catch {}
    throw e;
  }
}

interface JikanNamed {
  name?: string;
}

interface JikanAnime {
  mal_id: number;
  title?: string;
  title_english?: string | null;
  title_japanese?: string | null;
  synopsis?: string | null;
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
  genres?: JikanNamed[];
  studios?: JikanNamed[];
  year?: number | null;
  type?: string | null;
  status?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
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

function mapJikan(a: JikanAnime): Anime {
  return {
    malId: a.mal_id,
    source: "jikan",
    title: a.title_english || a.title || "Unknown title",
    titleJapanese: a.title_japanese ?? undefined,
    titleEnglish: a.title_english ?? undefined,
    synopsis: a.synopsis ?? undefined,
    coverImage: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
    bannerImage: a.images?.jpg?.large_image_url ?? undefined,
    genres: (a.genres || []).map((g) => g.name || "").filter(Boolean),
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

async function jikan<T>(path: string): Promise<T> {
  // Same-origin proxy only (no CORS, cached server-side, stale-on-429).
  // Callers fall back to mock data when the provider is unreachable.
  const r = await fetch(`/api/jikan${path}`);
  if (!r.ok) throw new Error(`proxy ${r.status}`);
  return (await r.json()) as T;
}

export async function searchAnime(q: string): Promise<Anime[]> {
  if (!q.trim()) return [];
  const mock = MOCK_ANIME.filter((a) =>
    `${a.title} ${a.titleJapanese} ${a.genres.join(" ")}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );
  try {
    const json = await cached(`search:${q.toLowerCase()}`, () =>
      jikan<{ data?: JikanAnime[] }>(`/anime?q=${encodeURIComponent(q)}&limit=12&sfw=true`)
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
    const json = await cached(`anime:${malId}`, () => jikan<{ data?: JikanAnime }>(`/anime/${malId}/full`));
    if (json?.data) return mapJikan(json.data);
    return mock ?? null;
  } catch {
    return mock ?? null;
  }
}

export async function getAnimeEpisodes(
  malId: number,
  page = 1
): Promise<{ episodes: Episode[]; hasNext: boolean }> {
  if (isKitsuId(malId)) {
    try {
      const eps = await getKitsuEpisodes(kitsuIdOf(malId));
      return { episodes: eps, hasNext: false };
    } catch {
      return { episodes: [], hasNext: false };
    }
  }
  const mock = MOCK_ANIME.find((a) => a.malId === malId);
  try {
    const json = await cached(`eps:${malId}:${page}`, () =>
      jikan<{ data?: JikanEpisode[]; pagination?: { has_next_page?: boolean } }>(`/anime/${malId}/episodes?page=${page}`)
    );
    const eps: Episode[] = (json.data || []).map((e) => ({
      number: typeof e.episode === "string" ? parseInt(e.episode, 10) || 0 : e.episode ?? 0,
      title: e.title || undefined,
      titleJapanese: e.title_japanese || undefined,
      synopsis: e.synopsis || undefined,
      airDate: e.aired || undefined,
      runtime: e.duration ? parseInt(String(e.duration), 10) || 24 : 24,
      score: e.score ?? undefined,
    }));
    if (eps.length) return { episodes: eps, hasNext: !!json.pagination?.has_next_page };
    throw new Error("empty");
  } catch {
    if (mock) return { episodes: mockEpisodes(mock), hasNext: false };
    return { episodes: [], hasNext: false };
  }
}

export async function getBrowseLists(): Promise<{
  trending: Anime[];
  airing: Anime[];
  top: Anime[];
  live: ProviderStatus;
}> {
  try {
    const [season, top] = await Promise.all([
      cached("season-now", () => jikan<{ data?: JikanAnime[] }>("/seasons/now?limit=12&sfw=true")),
      cached("top-anime", () => jikan<{ data?: JikanAnime[] }>("/top/anime?limit=12&sfw=true")),
    ]);
    const seasonList = (season.data || []).map(mapJikan);
    const topList = (top.data || []).map(mapJikan);
    const airing = seasonList.filter((a: Anime) => a.airing !== false);
    return {
      trending: seasonList.slice(0, 10),
      airing: airing.length ? airing : seasonList,
      top: topList,
      live: "jikan",
    };
  } catch {
    try {
      const k = await getKitsuBrowse();
      if (k.trending.length) return { ...k, live: "kitsu" as const };
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

export function mockById(malId: number): Anime | undefined {
  return MOCK_ANIME.find((a) => a.malId === malId);
}
