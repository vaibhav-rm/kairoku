import type { AiringItem, Episode, LibraryEntry } from "@/types";
import { getAnimeEpisodes } from "./anime-api";

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
}

/**
 * Build the release schedule for everything the user is currently watching
 * that is still airing. Ordering is by absolute air time.
 */
export async function buildSchedule(library: LibraryEntry[]): Promise<Schedule> {
  const watching = library.filter(
    (e) => e.anime?.airing && e.status === "watching"
  );

  const infos = await Promise.all(
    watching.map(async (entry) => {
      try {
        const info = await getAiringInfo(entry.anime!.animeId);
        return { anime: entry.anime!, ...info };
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
  return { upcoming, recent };
}

/** Airing titles from the watching list (used to display "no schedule yet"). */
export function airingWatchingCount(library: LibraryEntry[]): number {
  return library.filter((e) => e.anime?.airing && e.status === "watching").length;
}
