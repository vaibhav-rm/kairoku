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

export interface EpisodeLog {
  id: string;
  animeId: number;
  animeTitle: string;
  coverImage?: string;
  episodeNumber: number;
  episodeTitle?: string;
  rating: number;
  note: string;
  isPublic: boolean;
  spoilers: boolean;
  date: string; // yyyy-mm-dd
  createdAt: string;
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
  createdAt: string;
}

export interface KNotification {
  id: string;
  type: "episode" | "like" | "follow" | "review";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  animeId?: number;
}
