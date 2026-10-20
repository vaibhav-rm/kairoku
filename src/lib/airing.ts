import type { AiringItem, Anime, Episode, LibraryEntry } from "@/types";
import { getAnimeEpisodes, getAnimeGroup } from "./anime-api";

export interface AiringInfo {
  /** First episode whose air date is still in the future. */
  next: Episode | null;
  /** Most recent episode that has already aired. */
  latest: Episode | null;
}

function airTime(ep: Episode): number | null {
  return ep.airDate ? new Date(ep.airDate).getTime() : null;
}

/**
 * Resolve the next unaired and latest aired episode for a title.
 *
 * Kitsu paginates episodes oldest-first, so the interesting end of a long
 * (still-airing) series lives on the last page — we jump straight there
 * instead of walking every page.
 */
export async function getAiringInfo(animeId: number): Promise<AiringInfo> {
  const now = Date.now();
  const first = await getAnimeEpisodes(animeId, 1);
  const lastPage = Math.max(1, first.lastPage);
  const episodes =
    lastPage === 1
      ? first.episodes
      : (await getAnimeEpisodes(animeId, lastPage)).episodes;

  const sorted = [...episodes].sort((a, b) => a.number - b.number);
  const next =
    sorted.find((e) => {
      const at = airTime(e);
      return at != null && at > now;
    }) ?? null;
  const latest =
    [...sorted].reverse().find((e) => {
      const at = airTime(e);
      return at != null && at <= now;
    }) ?? null;

  return { next, latest };
}

export interface Schedule {
  /** Airing episodes from your watching list, soonest first. */
  upcoming: AiringItem[];
  /** The latest already-aired episode of each title, newest first. */
  recent: AiringItem[];
  /** Number of distinct airing titles, including untracked new seasons. */
  airingCount: number;
}

function latestStart(anime: Anime): string {
  return anime.airedFrom || (anime.year ? `${anime.year}-01-01` : "");
}

/**
 * Pick the airing season for one watched entry. If the viewer finished (or
 * never started) season 1 but season 2 is airing, the newer season is the one
 * that belongs on the schedule.
 */
async function airingSeason(
  anime: Anime,
  tracked: Map<number, LibraryEntry>
): Promise<Anime | null> {
  let group: Anime[];
  try {
    group = await getAnimeGroup(anime.animeId);
  } catch {
    group = [anime];
  }

  const eligible = group.filter((member) => {
    if (!member.airing) return false;
    if (member.type !== "TV" && member.type !== "ONA") return false;
    const entry = tracked.get(member.animeId);
    return (
      !entry ||
      entry.status === "watching" ||
      entry.status === "plan_to_watch"
    );
  });
  if (!eligible.length) return null;

  return [...eligible].sort(
    (a, b) =>
      latestStart(a).localeCompare(latestStart(b)) ||
      a.animeId - b.animeId
  )[eligible.length - 1];
}

/** Run async work with a small concurrency cap so Kitsu doesn't throttle us. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

let scheduleCache:
  | { key: string; at: number; data: Promise<Schedule> }
  | null = null;
const SCHEDULE_TTL = 5 * 60 * 1000;

function scheduleKey(library: LibraryEntry[]): string {
  return library
    .map((entry) => `${entry.animeId}:${entry.status}`)
    .sort()
    .join("|");
}

/**
 * Build the release schedule for everything the user is currently watching
 * that is still airing. Franchises are resolved so a new, untracked season
 * still appears when its predecessor is on the viewer's list.
 *
 * Home and /upcoming both ask for the same schedule, so share one in-flight
 * promise for a few minutes instead of walking the franchise graph twice.
 */
export function buildSchedule(library: LibraryEntry[]): Promise<Schedule> {
  const key = scheduleKey(library);
  if (scheduleCache && scheduleCache.key === key && Date.now() - scheduleCache.at < SCHEDULE_TTL) {
    return scheduleCache.data;
  }
  const data = buildScheduleUncached(library);
  scheduleCache = { key, at: Date.now(), data };
  data.catch(() => {
    if (scheduleCache?.data === data) scheduleCache = null;
  });
  return data;
}

async function buildScheduleUncached(library: LibraryEntry[]): Promise<Schedule> {
  const tracked = new Map(library.map((entry) => [entry.animeId, entry]));
  const watching = library.filter((entry) => entry.status === "watching" && entry.anime);

  const picks = await mapLimit(watching, 4, async (entry) =>
    airingSeason(entry.anime!, tracked)
  );

  const candidates = new Map<number, Anime>();
  for (const anime of picks) {
    if (anime) candidates.set(anime.animeId, anime);
  }

  const infos = await Promise.all(
    [...candidates.values()].map(async (anime) => {
      try {
        const info = await getAiringInfo(anime.animeId);
        return { anime, ...info };
      } catch {
        return null;
      }
    })
  );

  const upcoming: AiringItem[] = [];
  const recent: AiringItem[] = [];
  for (const info of infos) {
    if (!info) continue;
    const { anime, next, latest } = info;
    const nextAt = next ? airTime(next) : null;
    if (next && nextAt != null) {
      upcoming.push({ anime, episode: next, airsAt: nextAt, kind: "upcoming" });
    }
    const latestAt = latest ? airTime(latest) : null;
    if (latest && latestAt != null) {
      recent.push({ anime, episode: latest, airsAt: latestAt, kind: "recent" });
    }
  }

  upcoming.sort((a, b) => a.airsAt - b.airsAt);
  recent.sort((a, b) => b.airsAt - a.airsAt);
  return { upcoming, recent, airingCount: candidates.size };
}
