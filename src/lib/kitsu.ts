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
  type?: string;
  attributes: KitsuAttributes;
  relationships?: {
    categories?: { data?: { id: string }[] };
    destination?: { data?: { id: string; type: string } };
    source?: { data?: { id: string; type: string } };
  };
}

interface KitsuIncluded {
  id: string;
  type: string;
  attributes?: Partial<KitsuAttributes> & Partial<KitsuCategoryAttributes> & {
    role?: string;
  };
  relationships?: KitsuItem["relationships"];
}

interface KitsuDoc {
  data?: KitsuItem[] | KitsuItem;
  included?: KitsuIncluded[];
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
const RELATION_INCLUDES = `include=categories,mediaRelationships.destination&${FIELDS}&fields[categories]=title`;
// Kitsu caps every page at 20 records.
const MAX_PAGE = 20;
const MAX_FRANCHISE_ENTRIES = 60;
const MAX_FRANCHISE_FETCHES = 24;
const MAX_RELATION_DEPTH = 8;

// Relationship roles that belong to the same story family. "adaptation"
// points at source manga, "character" at cameos and "other" at promos/music
// videos, so those are deliberately excluded.
const GROUP_ROLES = new Set([
  "sequel",
  "prequel",
  "side_story",
  "parent_story",
  "full_story",
  "summary",
  "spinoff",
  "spin_off",
  "alternative_setting",
  "alternative_version",
]);

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
    titleRomaji: a.titles?.en_jp || undefined,
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

interface KitsuRelation {
  role: string;
  destinationKitsuId: number;
}

export interface KitsuAnimeWithRelations {
  anime: Anime;
  relations: KitsuRelation[];
  /** Anime records included alongside the relationships, keyed by Kitsu id. */
  related: Map<number, Anime>;
}

// The relationship graph is immutable enough to keep for the session. This
// also lets root discovery and franchise building share the same responses.
const relationCache = new Map<number, Promise<KitsuAnimeWithRelations | null>>();

/** Fetch one title together with its related-anime graph. */
export function getKitsuAnimeWithRelations(
  kitsuId: number
): Promise<KitsuAnimeWithRelations | null> {
  const cached = relationCache.get(kitsuId);
  if (cached) return cached;

  const task = (async () => {
    const doc = await get<KitsuDoc>(`/anime/${kitsuId}?${RELATION_INCLUDES}`);
    const item = Array.isArray(doc.data) ? doc.data[0] : doc.data;
    if (!item) return null;

    const anime = mapKitsu(item, doc);
    const related = new Map<number, Anime>();
    related.set(kitsuId, anime);

    for (const inc of doc.included || []) {
      if (inc.type !== "anime" || !inc.attributes) continue;
      const id = parseInt(inc.id, 10);
      if (!Number.isFinite(id)) continue;
      const attrs = inc.attributes as KitsuAttributes;
      if (BLOCKED_RATINGS.has(attrs.ageRating || "")) continue;
      const mapped = mapKitsu(inc as KitsuItem, doc);
      if (mapped.coverImage) related.set(id, mapped);
    }

    const relations: KitsuRelation[] = [];
    for (const inc of doc.included || []) {
      if (inc.type !== "mediaRelationships") continue;
      const destination = inc.relationships?.destination?.data;
      if (!destination || destination.type !== "anime") continue;
      const destinationKitsuId = parseInt(destination.id, 10);
      if (!Number.isFinite(destinationKitsuId)) continue;
      relations.push({
        role: inc.attributes?.role || "other",
        destinationKitsuId,
      });
    }

    return { anime, relations, related };
  })().catch((error) => {
    relationCache.delete(kitsuId);
    throw error;
  });

  relationCache.set(kitsuId, task);
  return task;
}

function startOf(anime: Anime): string {
  // Undated entries sort last so an announced season doesn't become the root.
  return anime.airedFrom || (anime.year ? `${anime.year}-01-01` : "9999-12-31");
}

function earliest(anime: Anime[]): Anime | undefined {
  return [...anime].sort(
    (a, b) =>
      startOf(a).localeCompare(startOf(b)) ||
      a.animeId - b.animeId
  )[0];
}

/**
 * Walk `prequel` links back to the earliest TV entry. Starting from a later
 * season, OVA or movie still lands on the same franchise root.
 */
export async function resolveKitsuRoot(kitsuId: number): Promise<number> {
  let current = kitsuId;
  const seen = new Set<number>();

  for (let depth = 0; depth < MAX_RELATION_DEPTH; depth++) {
    if (seen.has(current)) break;
    seen.add(current);

    let doc: KitsuAnimeWithRelations | null = null;
    try {
      doc = await getKitsuAnimeWithRelations(current);
    } catch {
      break;
    }
    if (!doc) break;

    const prequels = doc.relations
      .filter((rel) => rel.role === "prequel")
      .map((rel) => doc!.related.get(rel.destinationKitsuId))
      .filter((anime): anime is Anime => !!anime);
    if (!prequels.length) break;

    const tv = prequels.filter((anime) => anime.type === "TV");
    const parent = earliest(tv.length ? tv : prequels);
    if (!parent) break;

    const next = kitsuIdOf(parent.animeId);
    if (next === current) break;
    current = next;
  }

  return current;
}

const TYPE_ORDER = ["TV", "ONA", "OVA", "MOVIE", "SPECIAL", "MUSIC"];

function typeOrder(anime: Anime): number {
  const i = TYPE_ORDER.indexOf((anime.type || "").toUpperCase());
  return i === -1 ? TYPE_ORDER.length : i;
}

/**
 * Build the full franchise around a root: seasons, films, OVAs, specials and
 * side stories. The BFS follows sequel/prequel links (and TV/ONA side stories)
 * while only spending requests on entries that can lead to more seasons.
 */
export async function getKitsuFranchise(
  rootKitsuId: number
): Promise<Anime[]> {
  const rootAnimeId = KITSU_NS + rootKitsuId;
  const members = new Map<number, Anime>();
  const queued = new Set<number>([rootKitsuId]);
  const queue: number[] = [rootKitsuId];
  let fetches = 0;

  for (
    let round = 0;
    queue.length &&
    round < MAX_RELATION_DEPTH &&
    fetches < MAX_FRANCHISE_FETCHES &&
    members.size < MAX_FRANCHISE_ENTRIES;
    round++
  ) {
    const batch = queue.splice(
      0,
      Math.min(6, MAX_FRANCHISE_FETCHES - fetches)
    );
    fetches += batch.length;

    const docs = await Promise.all(
      batch.map(async (id) => {
        try {
          return await getKitsuAnimeWithRelations(id);
        } catch {
          return null;
        }
      })
    );

    const next: number[] = [];
    for (const doc of docs) {
      if (!doc) continue;
      members.set(doc.anime.animeId, doc.anime);

      for (const rel of doc.relations) {
        if (!GROUP_ROLES.has(rel.role)) continue;
        const anime = doc.related.get(rel.destinationKitsuId);
        if (!anime) continue;

        if (!members.has(anime.animeId) && members.size < MAX_FRANCHISE_ENTRIES) {
          members.set(anime.animeId, anime);
        }

        const type = (anime.type || "").toUpperCase();
        const follow =
          rel.role === "sequel" ||
          rel.role === "prequel" ||
          type === "TV" ||
          type === "ONA";
        if (
          follow &&
          !queued.has(rel.destinationKitsuId) &&
          queued.size < MAX_FRANCHISE_FETCHES
        ) {
          queued.add(rel.destinationKitsuId);
          next.push(rel.destinationKitsuId);
        }
      }
    }

    queue.push(...next);
  }

  // Keep the requested root even when its relationships failed to load.
  if (!members.has(rootAnimeId)) {
    try {
      const root = await getKitsuAnime(rootKitsuId);
      if (root) members.set(root.animeId, root);
    } catch {}
  }

  return [...members.values()].sort((a, b) => {
    if (a.animeId === rootAnimeId) return -1;
    if (b.animeId === rootAnimeId) return 1;
    return (
      startOf(a).localeCompare(startOf(b)) ||
      typeOrder(a) - typeOrder(b) ||
      a.animeId - b.animeId
    );
  });
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
