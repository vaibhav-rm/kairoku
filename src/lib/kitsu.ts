import type { Anime, Episode } from "@/types";

// Second live metadata provider (used when Jikan is unreachable).
// Kitsu is a public JSON:API with permissive CORS, so browsers can call
// it directly. Kitsu IDs are namespaced into our ID space to avoid
// colliding with MAL/Jikan IDs (which are all well below the offset).
export const KITSU_NS = 9000000;
export const isKitsuId = (malId: number) => malId >= KITSU_NS;
export const kitsuIdOf = (malId: number) => malId - KITSU_NS;

const BASE = "https://kitsu.io/api/edge";

interface KitsuImage {
  tiny?: string;
  small?: string;
  medium?: string;
  large?: string;
  original?: string;
}

interface KitsuAttributes {
  canonicalTitle?: string;
  titles?: { en?: string; en_jp?: string; ja_jp?: string };
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
}

const FIELDS =
  "fields[anime]=canonicalTitle,titles,synopsis,posterImage,coverImage,averageRating,userCount,startDate,endDate,status,episodeCount,episodeLength,subtype";

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
    malId: KITSU_NS + (parseInt(item.id, 10) || 0),
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

async function get(path: string): Promise<KitsuDoc> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/vnd.api+json" } });
  if (!res.ok) throw new Error(`kitsu ${res.status}`);
  return (await res.json()) as KitsuDoc;
}

function list(doc: KitsuDoc): Anime[] {
  const items = Array.isArray(doc.data) ? doc.data : doc.data ? [doc.data] : [];
  return items.map((it) => mapKitsu(it, doc)).filter((a) => a.coverImage);
}

export async function searchKitsu(q: string): Promise<Anime[]> {
  if (!q.trim()) return [];
  const doc = await get(
    `/anime?filter[text]=${encodeURIComponent(q)}&page[limit]=12&include=categories&${FIELDS}&fields[categories]=title`
  );
  return list(doc);
}

export async function getKitsuAnime(kitsuId: number): Promise<Anime | null> {
  const doc = await get(`/anime/${kitsuId}?include=categories&${FIELDS}&fields[categories]=title`);
  const item = Array.isArray(doc.data) ? doc.data[0] : doc.data;
  return item ? mapKitsu(item, doc) : null;
}

export async function getKitsuEpisodes(kitsuId: number): Promise<Episode[]> {
  const doc = (await get(
    `/anime/${kitsuId}/episodes?page[limit]=20&sort=number&fields[episodes]=number,canonicalTitle,synopsis,airdate,length`
  )) as unknown as {
    data?: {
      attributes?: {
        number?: number;
        canonicalTitle?: string | null;
        synopsis?: string | null;
        airdate?: string | null;
        length?: number | null;
      };
    }[];
  };
  return (doc.data || [])
    .filter((e) => e.attributes?.number != null)
    .map((e) => ({
      number: e.attributes!.number!,
      title: e.attributes!.canonicalTitle || undefined,
      synopsis: e.attributes!.synopsis || undefined,
      airDate: e.attributes!.airdate || undefined,
      runtime: e.attributes!.length ?? 24,
    }));
}

export async function getKitsuBrowse(): Promise<{ trending: Anime[]; airing: Anime[]; top: Anime[] }> {
  const [trending, top] = await Promise.all([
    get(`/trending/anime?limit=12&include=categories&${FIELDS}&fields[categories]=title`),
    get(`/anime?sort=-averageRating&page[limit]=12&include=categories&${FIELDS}&fields[categories]=title`),
  ]);
  const t = list(trending);
  return {
    trending: t,
    airing: t.filter((a) => a.airing),
    top: list(top),
  };
}
