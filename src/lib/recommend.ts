import type {
  Anime,
  AnimeReview,
  EpisodeLog,
  LibraryEntry,
  Recommendation,
  RecommendationRail,
} from "@/types";
import {
  getAnimeByGenre,
  getAnimeRecommendations,
  getGenreIndex,
  getSeasonAnime,
  getTopAnime,
} from "./anime-api";

/**
 * A lightweight, fully client-side taste model.
 *
 * Weights are derived from what the user actually did (statuses, star
 * ratings, diary entries, favourite genres) and projected onto genre,
 * studio and decade axes. Recommendation scoring is then a dot product
 * between an anime's attributes and this profile.
 */
export interface TasteInput {
  library: LibraryEntry[];
  logs: EpisodeLog[];
  reviews: AnimeReview[];
  favoriteGenres?: string[];
}

interface Taste {
  genres: Map<string, number>;
  studios: Map<string, number>;
  decades: Map<string, number>;
  /** Anime we already know about — excluded from fresh recommendations. */
  seen: Set<number>;
  /** How much signal we had; 0 means a cold start. */
  signal: number;
}

function bump(map: Map<string, number>, key: string | undefined, w: number) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + w);
}

function normalize(map: Map<string, number>) {
  let max = 0;
  for (const v of map.values()) max = Math.max(max, Math.abs(v));
  if (max > 0) for (const [k, v] of map) map.set(k, v / max);
}

function decadeOf(year?: number): number | undefined {
  return year ? Math.floor(year / 10) * 10 : undefined;
}

export function buildTaste(input: TasteInput): Taste {
  const genres = new Map<string, number>();
  const studios = new Map<string, number>();
  const decades = new Map<string, number>();
  const seen = new Set<number>();

  const rate = (a: Anime | undefined, w: number) => {
    if (!a) return;
    seen.add(a.malId);
    for (const g of a.genres) bump(genres, g, w);
    for (const g of a.themes || []) bump(genres, g, w * 0.5);
    for (const s of a.studios) bump(studios, s, w * 0.6);
    const d = decadeOf(a.year);
    if (d != null) bump(decades, String(d), w * 0.4);
  };

  for (const entry of input.library) {
    let w = 0.4;
    if (entry.status === "dropped") w = -0.8;
    else if (entry.status === "completed") w += 0.45;
    else if (entry.status === "watching") w += 0.3;
    else if (entry.status === "plan_to_watch") w += 0.1;
    // Star rating dominates the signal: 0 => neutral, 5 => strong positive.
    if (entry.rating > 0) w += (entry.rating - 3) * 0.8;
    rate(entry.anime, w);
  }

  for (const log of input.logs) {
    const w = log.rating > 0 ? (log.rating - 3) * 0.6 : 0.15;
    seen.add(log.animeId);
    const a = input.library.find((e) => e.animeId === log.animeId)?.anime;
    if (a) {
      for (const g of a.genres) bump(genres, g, w);
    }
  }

  for (const review of input.reviews) {
    seen.add(review.animeId);
    const a = input.library.find((e) => e.animeId === review.animeId)?.anime;
    const w = review.rating > 0 ? (review.rating - 3) * 0.8 : 0.2;
    if (a) for (const g of a.genres) bump(genres, g, w);
  }

  for (const g of input.favoriteGenres || []) bump(genres, g, 1.6);

  normalize(genres);
  normalize(studios);
  normalize(decades);

  const signal =
    seen.size +
    input.logs.length * 0.5 +
    input.reviews.length +
    (input.favoriteGenres?.length || 0);

  return { genres, studios, decades, seen, signal };
}

/** Two strongest positive genre affinities, most-loved first. */
function topGenres(taste: Taste, n = 3): string[] {
  return [...taste.genres.entries()]
    .filter(([, v]) => v > 0.15)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([g]) => g);
}

export function scoreAnime(anime: Anime, taste: Taste): Recommendation {
  let score = 0;
  const reasons: string[] = [];

  const genreHits: string[] = [];
  for (const g of anime.genres) {
    const v = taste.genres.get(g);
    if (v) {
      score += v * 1.5;
      if (v > 0.2) genreHits.push(g);
    }
  }
  for (const g of anime.themes || []) {
    const v = taste.genres.get(g);
    if (v) {
      score += v * 0.6;
      if (v > 0.2) genreHits.push(g);
    }
  }

  let studioScore = 0;
  for (const s of anime.studios) studioScore += taste.studios.get(s) || 0;
  if (studioScore > 0.2) score += studioScore * 0.7;

  const dec = decadeOf(anime.year);
  if (dec != null) score += (taste.decades.get(String(dec)) || 0) * 0.35;

  // Quality prior: gently favour well-reviewed titles without letting the
  // MAL score bury a perfect genre match.
  if (anime.score != null) score += (anime.score - 7.2) * 0.4;
  if (anime.scoredBy && anime.scoredBy > 150_000) score += 0.1;

  if (genreHits.length)
    reasons.push(`More ${[...new Set(genreHits)].slice(0, 2).join(" · ")}`);
  if (studioScore > 0.5 && anime.studios[0])
    reasons.push(`From ${anime.studios[0]}`);
  if (anime.score != null && anime.score >= 8.4)
    reasons.push(`Rated ${anime.score.toFixed(2)}`);
  if (anime.airing) reasons.push("Airing now");

  return { anime, score: Math.round(score * 1000) / 1000, reasons };
}

function dedupe(list: Anime[]): Anime[] {
  const seen = new Set<number>();
  const out: Anime[] = [];
  for (const a of list) {
    if (!a.coverImage || seen.has(a.malId)) continue;
    seen.add(a.malId);
    out.push(a);
  }
  return out;
}

export function rankRecommendations(
  taste: Taste,
  candidates: Anime[],
  opts: { exclude?: Set<number>; limit?: number; allowSeen?: boolean } = {}
): Recommendation[] {
  const exclude = opts.exclude ?? new Set<number>();
  const limit = opts.limit ?? 12;
  return dedupe(candidates)
    .filter((a) => !exclude.has(a.malId))
    .filter((a) => opts.allowSeen || !taste.seen.has(a.malId))
    .map((a) => scoreAnime(a, taste))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface RecommendationBundle {
  forYou: Recommendation[];
  because: RecommendationRail[];
  /** False when we had no taste signal and fell back to popularity. */
  personalized: boolean;
}

/**
 * Orchestrates the candidate pool and produces both the main "For you"
 * rail and a few explainable "Because you liked X" rails.
 *
 * Candidate sources, in order of importance:
 *  1. MAL's own similarity graph for the user's best-rated titles
 *  2. Highest-rated titles within the user's top genres
 *  3. This season's airing anime
 *  4. All-time top anime (always present, keeps the rail full)
 */
export async function buildRecommendations(
  input: TasteInput,
  limit = 14
): Promise<RecommendationBundle> {
  const taste = buildTaste(input);
  const personalized = taste.signal >= 1;

  const library = input.library;
  const topRated = [...library]
    .filter((e) => e.anime && e.rating >= 3.5)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const genresWanted = topGenres(taste, 3);

  // Candidate pool — fetched sequentially so the throttle keeps us under
  // Jikan's 3 req/s ceiling.
  const pool: Anime[] = [];
  const top1 = await getTopAnime(1);
  pool.push(...top1);
  const season = await getSeasonAnime();
  pool.push(...season);

  const genreIndex = genresWanted.length ? await getGenreIndex() : new Map<string, number>();
  for (const g of genresWanted) {
    const id = genreIndex.get(g.toLowerCase());
    if (id) pool.push(...(await getAnimeByGenre(id, 18)));
  }

  // "Because you liked X" rails from MAL's similarity graph.
  const because: RecommendationRail[] = [];
  for (const entry of topRated) {
    const anime = entry.anime!;
    let similar = await getAnimeRecommendations(anime.malId, 12);
    // Fallback: same-genre, highest rated.
    if (!similar.length && anime.genres[0]) {
      const id = genreIndex.get(anime.genres[0].toLowerCase());
      if (id) similar = await getAnimeByGenre(id, 12);
    }
    similar = dedupe(similar)
      .filter((a) => a.malId !== anime.malId && !taste.seen.has(a.malId))
      .slice(0, 10);
    if (similar.length >= 3) {
      because.push({
        anime,
        reason: `Because you loved ${anime.title}`,
        items: similar,
      });
    }
    // Similar titles of a loved anime are great candidates too.
    pool.push(...similar);
  }

  const forYou = rankRecommendations(taste, pool, { limit });

  if (!forYou.length) {
    // Cold start / provider down — still give the user something.
    const fallback = rankRecommendations(
      { ...taste, genres: new Map() },
      await getTopAnime(2),
      { limit, allowSeen: true }
    );
    return { forYou: fallback, because, personalized: false };
  }

  return { forYou, because, personalized };
}
