import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { AnimeReview, CustomList, EpisodeEntry, LibraryEntry } from "@/types";

/**
 * Best-effort Firestore sync for a signed-in user's own data.
 *
 * Everything is local-first: `localStorage` remains the source of truth for
 * rendering, and these helpers mirror user-authored data into Firestore so it
 * survives a cleared cache or follows the user to another device. Every call
 * is wrapped so a missing config, offline network, or permission error simply
 * no-ops — the app keeps working in local mode.
 */

/** One document per anime, holding that anime's episode ratings/notes + watched set. */
export interface EpisodeDoc {
  animeId: number;
  /** Episode numbers ticked as watched. */
  watched: number[];
  /** episode number -> { rating, note } */
  entries: Record<string, EpisodeEntry>;
  updatedAt: string;
}

type FirestoreModule = typeof import("firebase/firestore");
type Database = NonNullable<typeof db>;

async function connect(): Promise<{ fs: FirestoreModule; database: Database } | null> {
  if (!isFirebaseConfigured || !db) return null;
  const database = db;
  try {
    const fs = await import("firebase/firestore");
    return { fs, database };
  } catch {
    return null;
  }
}

export async function pushLibraryEntry(uid: string, entry: LibraryEntry): Promise<void> {
  const conn = await connect();
  if (!conn) return;
  const { fs, database } = conn;
  try {
    await fs.setDoc(
      fs.doc(database, "users", uid, "library", String(entry.animeId)),
      {
        animeId: entry.animeId,
        anime: entry.anime ?? null,
        status: entry.status,
        currentEpisode: entry.currentEpisode,
        totalEpisodes: entry.totalEpisodes ?? null,
        rating: entry.rating,
        startedAt: entry.startedAt,
        completedAt: entry.completedAt ?? null,
        updatedAt: entry.updatedAt,
      },
      { merge: true }
    );
  } catch {}
}

export async function pushEpisode(uid: string, data: EpisodeDoc): Promise<void> {
  const conn = await connect();
  if (!conn) return;
  const { fs, database } = conn;
  try {
    await fs.setDoc(
      fs.doc(database, "users", uid, "episodes", String(data.animeId)),
      { ...data },
      { merge: true }
    );
  } catch {}
}

export async function pushList(uid: string, list: CustomList): Promise<void> {
  const conn = await connect();
  if (!conn) return;
  const { fs, database } = conn;
  try {
    await fs.setDoc(
      fs.doc(database, "users", uid, "lists", list.id),
      {
        id: list.id,
        name: list.name,
        description: list.description,
        isPublic: list.isPublic,
        animeIds: list.animeIds,
        items: list.items ?? [],
        createdAt: list.createdAt,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {}
}

export async function pushReview(uid: string, review: AnimeReview): Promise<void> {
  const conn = await connect();
  if (!conn) return;
  const { fs, database } = conn;
  try {
    await fs.setDoc(
      fs.doc(database, "animeReviews", review.id),
      { ...review, userId: uid, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch {}
}

export interface PulledData {
  library: LibraryEntry[];
  episodes: EpisodeDoc[];
  lists: CustomList[];
  reviews: AnimeReview[];
}

/** Read back everything the user owns. Returns null when Firebase is off. */
export async function pullUserData(uid: string): Promise<PulledData | null> {
  const conn = await connect();
  if (!conn) return null;
  const { fs, database } = conn;
  try {
    const [library, episodes, lists, reviews] = await Promise.all([
      fs.getDocs(fs.collection(database, "users", uid, "library")),
      fs.getDocs(fs.collection(database, "users", uid, "episodes")),
      fs.getDocs(fs.collection(database, "users", uid, "lists")),
      fs.getDocs(
        fs.query(fs.collection(database, "animeReviews"), fs.where("userId", "==", uid))
      ),
    ]);
    return {
      library: library.docs
        .map((d) => d.data() as LibraryEntry)
        .filter((e) => e && typeof e.animeId === "number"),
      episodes: episodes.docs.map((d) => d.data() as EpisodeDoc),
      lists: lists.docs.map((d) => d.data() as CustomList),
      reviews: reviews.docs.map((d) => d.data() as AnimeReview),
    };
  } catch {
    return null;
  }
}
