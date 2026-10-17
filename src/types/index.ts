export type LibraryStatus =
  | "watching"
  | "completed"
  | "plan_to_watch"
  | "paused"
  | "dropped";

export interface Anime {
  malId: number;
  /** Which provider this record came from (IDs are namespaced, see kitsu.ts). */
  source?: "jikan" | "kitsu" | "mock";
  title: string;
  titleJapanese?: string;
  titleEnglish?: string;
  synopsis?: string;
  coverImage: string;
  bannerImage?: string;
  genres: string[];
  /** Themes + demographics (e.g. "Isekai", "Shounen"), when provided. */
  themes?: string[];
  studios: string[];
  year?: number;
  type?: string;
  status?: string;
  score?: number;
  scoredBy?: number;
  rank?: number;
  popularity?: number;
  episodes?: number | null;
  airing?: boolean;
  airedFrom?: string;
  airedTo?: string;
  broadcast?: string;
  nextEpisode?: { number: number; airsAt: string } | null;
  trailer?: string;
}

export interface Episode {
  malId?: number;
  number: number;
  title?: string;
  titleJapanese?: string;
  synopsis?: string;
  airDate?: string;
  runtime?: number;
  score?: number;
}

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  timezone: string;
  favoriteAnime?: string;
  favoriteGenres?: string[];
  createdAt: string;
}

export interface LibraryEntry {
  animeId: number;
  anime?: Anime;
  status: LibraryStatus;
  currentEpisode: number;
  totalEpisodes?: number | null;
  rating: number; // 0-5 step 0.5, 0 = unrated
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * A user's record for a single episode. The note is optional and always kept
 * alongside the rating so the two travel together (and to Firestore).
 */
export interface EpisodeEntry {
  /** 0-5 step 0.5, 0 = unrated. */
  rating: number;
  note?: string;
  updatedAt: string;
}

export interface AnimeReview {
  id: string;
  animeId: number;
  animeTitle: string;
  coverImage?: string;
  rating: number;
  title: string;
  body: string;
  spoilers: boolean;
  likes: number;
  liked?: boolean;
  createdAt: string;
}

export interface CustomList {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  animeIds: number[];
  /**
   * Snapshot of the anime contained in this list. Kept alongside
   * `animeIds` so a list keeps its titles even if they're later removed
   * from the library (and so non-library titles can be listed at all).
   */
  items?: Anime[];
  createdAt: string;
}

/** A scored recommendation produced by the taste engine. */
export interface Recommendation {
  anime: Anime;
  score: number;
  reasons: string[];
}

/** "Because you liked X" rail. */
export interface RecommendationRail {
  anime: Anime;
  reason: string;
  items: Anime[];
}

export interface KNotification {
  id: string;
  type: "episode" | "like" | "follow" | "review";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  animeId?: number;
  /** For episode notifications: which episode aired (used to de-dupe). */
  episodeNumber?: number;
}

/** An upcoming (or just-aired) episode for a title you're watching. */
export interface AiringItem {
  anime: Anime;
  episode: Episode;
  /** Milliseconds since epoch when the episode airs. */
  airsAt: number;
  kind: "upcoming" | "recent";
}
