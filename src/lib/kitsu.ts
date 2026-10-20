import type { Anime, Episode } from "@/types";

// Metadata provider: Kitsu's public JSON:API. It has permissive CORS, so the
// browser talks to it directly — no proxy Function needed.
// Kitsu ids are offset into our own id space via KITSU_NS so stored records,
// links and caches stay stable and independent of the raw provider id.
export const KITSU_NS = 9000000;
export const isKitsuId = (animeId: number) => animeId >= KITSU_NS;
export const kitsuIdOf = (animeId: number) => animeId - KITSU_NS;

const BASE = "https://kitsu.io/api/edge";
const PAGE_SIZE = 20;

interface KitsuImage {
  tiny?: string;
  small?: string;
  medium?: string;
  large?: string;
  original?: string;
}

interface KitsuAttributes {
  canonicalTitle?: string;
  titles?: { en?: string; en_jp?: string; en_us?: string; ja_jp?: string };
  synopsis?: string;
  posterImage?: KitsuImage | null;
  coverImage?: KitsuImage | null;
  averageRating?: string | null;
  userCount?: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  episodeCount?: number | null;
  episodeLength?: number | null;
  subtype?: string;
  ageRating?: string | null;
}

interface KitsuItem {
  id: string;
  attributes: KitsuAttributes;
  relationships?: {
    categories?: { data?: { id: string }[] };
  };
}

interface KitsuDoc {
  data?: KitsuItem[] | KitsuItem;
  included?: { id: string; type: string; attributes?: { title?: string } }[];
  links?: { first?: string; next?: string; last?: string };
  meta?: { count?: number };
}

interface KitsuEpisodeAttributes {
  number?: number;
  canonicalTitle?: string | null;
  synopsis?: string | null;
  airdate?: string | null;
  length?: number | null;
}

interface KitsuEpisodeDoc {
  data?: { attributes?: KitsuEpisodeAttributes }[];
  links?: { next?: string };
  meta?: { count?: number };
}

interface KitsuCategoryAttributes {
  title?: string;
  slug?: string;
  nsfw?: boolean;
}

interface KitsuCategoryDoc {
  data?: { id: string; attributes?: KitsuCategoryAttributes }[];
}

const FIELDS =
  "fields[anime]=canonicalTitle,titles,synopsis,posterImage,coverImage,averageRating,userCount,startDate,endDate,status,episodeCount,episodeLength,subtype,ageRating,categories";
const INCLUDES = `include=categories&${FIELDS}&fields[categories]=title`;
// Kitsu caps every page at 20 records.
const MAX_PAGE = 20;

// Kitsu marks adult titles explicitly; keep them out of search and browse.
const BLOCKED_RATINGS = new Set(["R18+", "RX"]);

function categoriesOf(doc: KitsuDoc, item: KitsuItem): string[] {
  const ids = new Set((item.relationships?.categories?.data || []).map((d) => d.id));
  if (ids.size === 0 || !doc.included) return [];
  const titles = new Map<string, string>();
  for (const inc of doc.included) {
    if (inc.type === "categories" && inc.attributes?.title) titles.set(inc.id, inc.attributes.title);
  }
  return [...ids].map((id) => titles.get(id)).filter((t): t is string => !!t).slice(0, 4);
}

function mapKitsu(item: KitsuItem, doc: KitsuDoc): Anime {
  const a = item.attributes;
  const score = a.averageRating ? parseFloat(a.averageRating) / 10 : undefined;
  const year = a.startDate ? parseInt(a.startDate.slice(0, 4), 10) || undefined : undefined;
  const airing = a.status === "current";
  const status =
    a.status === "current"
      ? "Currently Airing"
      : a.status === "finished"
        ? "Finished Airing"
        : "Not Yet Aired";
  const img = (im?: KitsuImage | null) => im?.large || im?.medium || im?.small || im?.original || "";
  return {
    animeId: KITSU_NS + (parseInt(item.id, 10) || 0),
    source: "kitsu",
    title: a.titles?.en || a.titles?.en_jp || a.canonicalTitle || "Unknown title",
    titleJapanese: a.titles?.ja_jp || undefined,
    titleEnglish: a.titles?.en || a.titles?.en_jp || undefined,
    synopsis: a.synopsis || undefined,
    coverImage: img(a.posterImage),
    bannerImage: img(a.coverImage) || undefined,
    genres: categoriesOf(doc, item),
    studios: [],
    year,
    type: a.subtype ? a.subtype.toUpperCase() : undefined,
    status,
    score: score != null && !isNaN(score) ? Math.round(score * 100) / 100 : undefined,
    scoredBy: a.userCount,
    episodes: a.episodeCount ?? undefined,
    airing,
    airedFrom: a.startDate || undefined,
    airedTo: a.endDate || undefined,
  };
}

async function get<T = KitsuDoc>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/vnd.api+json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`kitsu ${res.status}`);
  return (await res.json()) as T;
}

function list(doc: KitsuDoc): Anime[] {
  const items = Array.isArray(doc.data) ? doc.data : doc.data ? [doc.data] : [];
  return items
    .filter((it) => !BLOCKED_RATINGS.has(it.attributes.ageRating || ""))
    .map((it) => mapKitsu(it, doc))
    .filter((a) => a.coverImage);
}

export async function searchKitsu(q: string): Promise<Anime[]> {
  if (!q.trim()) return [];
  const doc = await get(
    `/anime?filter[text]=${encodeURIComponent(q)}&page[limit]=12&${INCLUDES}`
  );
  return list(doc);
}

export async function getKitsuAnime(kitsuId: number): Promise<Anime | null> {
  const doc = await get<KitsuDoc>(`/anime/${kitsuId}?${INCLUDES}`);
  const item = Array.isArray(doc.data) ? doc.data[0] : doc.data;
  return item ? mapKitsu(item, doc) : null;
}

export interface KitsuEpisodePage {
  episodes: Episode[];
  total: number;
}

export async function getKitsuEpisodePage(
  kitsuId: number,
  page = 1,
  perPage = PAGE_SIZE
): Promise<KitsuEpisodePage> {
  const doc = await get<KitsuEpisodeDoc>(
    `/anime/${kitsuId}/episodes?page[limit]=${perPage}&page[offset]=${
      (page - 1) * perPage
    }&sort=number&fields[episodes]=number,canonicalTitle,synopsis,airdate,length`
  );
  const rows = (doc.data || []).filter((e) => e.attributes?.number != null);
  return {
    episodes: rows.map((e) => ({
      number: e.attributes!.number!,
      title: e.attributes!.canonicalTitle || undefined,
      synopsis: e.attributes!.synopsis || undefined,
      airDate: e.attributes!.airdate || undefined,
      runtime: e.attributes!.length ?? 24,
    })),
    total: doc.meta?.count ?? rows.length,
  };
}

export async function getKitsuBrowse(): Promise<{
  trending: Anime[];
  airing: Anime[];
  top: Anime[];
}> {
  const [trending, airing, top] = await Promise.all([
    // Kitsu's /trending endpoint ignores includes, so derive the rail from
    // the most-followed currently-airing titles instead (genres included).
    get(
      `/anime?filter[status]=current&sort=-userCount&page[limit]=12&${INCLUDES}`
    ),
    get(
      `/anime?filter[status]=current&sort=-startDate&page[limit]=${MAX_PAGE}&${INCLUDES}`
    ),
    get(`/anime?sort=-averageRating&page[limit]=${MAX_PAGE}&${INCLUDES}`),
  ]);
  return {
    trending: list(trending).slice(0, 12),
    airing: list(airing),
    top: list(top).slice(0, 12),
  };
}

export async function getKitsuTop(page = 1, limit = MAX_PAGE): Promise<Anime[]> {
  const size = Math.min(Math.max(1, limit), MAX_PAGE);
  const offset = Math.max(0, page - 1) * size;
  const doc = await get(
    `/anime?sort=-averageRating&page[limit]=${size}&page[offset]=${offset}&${INCLUDES}`
  );
  return list(doc);
}

export async function getKitsuAiring(limit = MAX_PAGE): Promise<Anime[]> {
  const size = Math.min(Math.max(1, limit), MAX_PAGE);
  const doc = await get(
    `/anime?filter[status]=current&sort=-startDate&page[limit]=${size}&${INCLUDES}`
  );
  return list(doc);
}

export async function getKitsuByCategory(
  slug: string,
  limit = 18
): Promise<Anime[]> {
  const size = Math.min(Math.max(1, limit), MAX_PAGE);
  const doc = await get(
    `/anime?filter[categories]=${encodeURIComponent(
      slug
    )}&sort=-averageRating&page[limit]=${size}&${INCLUDES}`
  );
  return list(doc);
}

export interface KitsuCategory {
  id: string;
  title: string;
  slug: string;
}

export async function getKitsuCategories(): Promise<KitsuCategory[]> {
  const doc = await get<KitsuCategoryDoc>(
    `/categories?page[limit]=250&fields[categories]=title,slug,nsfw`
  );
  return (doc.data || [])
    .filter((c) => !c.attributes?.nsfw && c.attributes?.title && c.attributes?.slug)
    .map((c) => ({
      id: c.id,
      title: c.attributes!.title!,
      slug: c.attributes!.slug!,
    }));
}
