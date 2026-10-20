"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Anime,
  AnimeReview,
  AppUser,
  CustomList,
  EpisodeEntry,
  KNotification,
  LibraryEntry,
  LibraryStatus,
} from "@/types";
import { auth, db, initAnalytics, isFirebaseConfigured, authErrorMessage } from "@/lib/firebase";
import { getAiringInfo } from "@/lib/airing";
import {
  pullUserData,
  pushEpisode,
  pushLibraryEntry,
  pushList,
  pushReview,
  type EpisodeDoc,
} from "@/lib/sync";

interface Store {
  user: AppUser | null;
  ready: boolean;
  firebaseMode: boolean;
  signIn: (usernameOrEmail: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<AppUser>) => void;
  library: LibraryEntry[];
  upsertLibrary: (anime: Anime, patch: Partial<LibraryEntry>) => void;
  setStatus: (anime: Anime, status: LibraryStatus) => void;
  setProgress: (animeId: number, ep: number) => void;
  setAnimeRating: (animeId: number, rating: number) => void;
  removeFromLibrary: (animeId: number) => void;
  /** Explicitly-marked watched episodes, keyed by anime id. */
  watched: Record<string, number[]>;
  isWatched: (animeId: number, episode: number) => boolean;
  toggleWatched: (anime: Anime, episode: number, total?: number | null) => void;
  /** Per-episode records (rating + optional note): animeId -> episode -> entry. */
  episodeData: Record<string, Record<string, EpisodeEntry>>;
  getEpisodeEntry: (animeId: number, episode: number) => EpisodeEntry | undefined;
  getEpisodeRating: (animeId: number, episode: number) => number;
  getEpisodeNote: (animeId: number, episode: number) => string;
  setEpisodeRating: (animeId: number, episode: number, rating: number) => void;
  /** Save (or clear) an episode's optional note, keeping its rating. */
  setEpisodeNote: (animeId: number, episode: number, note: string) => void;
  reviews: AnimeReview[];
  addReview: (r: Omit<AnimeReview, "id" | "createdAt" | "likes">) => AnimeReview;
  toggleLikeReview: (id: string) => void;
  lists: CustomList[];
  saveList: (
    l: Omit<CustomList, "id" | "createdAt"> & { id?: string }
  ) => CustomList;
  deleteList: (id: string) => void;
  addToList: (listId: string, anime: Anime) => void;
  removeFromList: (listId: string, animeId: number) => void;
  hasInList: (listId: string, animeId: number) => boolean;
  notifications: KNotification[];
  markAllRead: () => void;
  /** Check airing titles for newly-released episodes and notify. */
  syncAiringNotifications: () => Promise<void>;
  toast: string | null;
  showToast: (msg: string) => void;
}

const Ctx = createContext<Store | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

/**
 * Load episode records, migrating the older number-only shape
 * (animeId -> episode -> rating) into { rating, note, updatedAt } entries.
 */
function loadEpisodeData(): Record<string, Record<string, EpisodeEntry>> {
  try {
    const raw = localStorage.getItem("kairoku:episodeData");
    if (raw) return JSON.parse(raw) as Record<string, Record<string, EpisodeEntry>>;
    const legacy = localStorage.getItem("kairoku:episodeRatings");
    if (legacy) {
      const parsed = JSON.parse(legacy) as Record<string, Record<string, number>>;
      const migrated: Record<string, Record<string, EpisodeEntry>> = {};
      for (const [animeId, eps] of Object.entries(parsed)) {
        migrated[animeId] = {};
        for (const [ep, rating] of Object.entries(eps)) {
          migrated[animeId][ep] = { rating, updatedAt: new Date(0).toISOString() };
        }
      }
      return migrated;
    }
  } catch {}
  return {};
}

// Gap-filling merges: remote data never overwrites local edits (local-first),
// it only backfills what this device doesn't already have. Watched sets union.

function mergeLibrary(local: LibraryEntry[], remote: LibraryEntry[]): LibraryEntry[] {
  if (!remote.length) return local;
  const byId = new Map(local.map((e) => [String(e.animeId), e] as const));
  let changed = false;
  for (const entry of remote) {
    if (!entry || typeof entry.animeId !== "number") continue;
    const key = String(entry.animeId);
    if (!byId.has(key)) {
      byId.set(key, entry);
      changed = true;
    }
  }
  return changed ? [...byId.values()] : local;
}

function mergeEpisodeData(
  local: Record<string, Record<string, EpisodeEntry>>,
  remote: EpisodeDoc[]
): Record<string, Record<string, EpisodeEntry>> {
  if (!remote.length) return local;
  const next: Record<string, Record<string, EpisodeEntry>> = { ...local };
  let changed = false;
  for (const doc of remote) {
    const key = String(doc.animeId);
    const forAnime = { ...(next[key] || {}) };
    for (const [ep, entry] of Object.entries(doc.entries || {})) {
      const existing = forAnime[ep];
      if (
        !existing ||
        new Date(entry.updatedAt || 0).getTime() >
          new Date(existing.updatedAt || 0).getTime()
      ) {
        forAnime[ep] = entry;
        changed = true;
      }
    }
    if (Object.keys(forAnime).length) next[key] = forAnime;
  }
  return changed ? next : local;
}

function mergeWatched(
  local: Record<string, number[]>,
  remote: EpisodeDoc[]
): Record<string, number[]> {
  if (!remote.length) return local;
  const next = { ...local };
  let changed = false;
  for (const doc of remote) {
    const key = String(doc.animeId);
    const existing = next[key] || [];
    const set = new Set([...existing, ...(doc.watched || [])]);
    if (set.size !== existing.length) {
      next[key] = [...set].sort((a, b) => a - b);
      changed = true;
    }
  }
  return changed ? next : local;
}

function mergeLists(local: CustomList[], remote: CustomList[]): CustomList[] {
  if (!remote.length) return local;
  const byId = new Map(local.map((l) => [l.id, l] as const));
  let changed = false;
  for (const list of remote) {
    if (!list?.id || byId.has(list.id)) continue;
    byId.set(list.id, list);
    changed = true;
  }
  return changed ? [...byId.values()] : local;
}

function mergeReviews(local: AnimeReview[], remote: AnimeReview[]): AnimeReview[] {
  if (!remote.length) return local;
  const byId = new Map(local.map((r) => [r.id, r] as const));
  let changed = false;
  for (const review of remote) {
    if (!review?.id || byId.has(review.id)) continue;
    byId.set(review.id, review);
    changed = true;
  }
  return changed ? [...byId.values()] : local;
}

const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/**
 * Best-effort username from an email/local-part, sanitized to the allowed
 * charset. Never returns the old catch-all "traveler" — onboarding asks the
 * user to confirm or change it.
 */
function deriveUsername(email: string | null | undefined): string {
  const base = (email || "user")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return base.length >= 3
    ? base
    : `watcher_${Math.floor(1000 + Math.random() * 9000)}`;
}

/** How long to wait between airing checks for new episodes. */
const AIRING_SYNC_TTL = 1000 * 60 * 60 * 3;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [watched, setWatched] = useState<Record<string, number[]>>({});
  const [episodeData, setEpisodeData] = useState<
    Record<string, Record<string, EpisodeEntry>>
  >({});
  const [reviews, setReviews] = useState<AnimeReview[]>([]);
  const [lists, setLists] = useState<CustomList[]>([]);
  const [notifications, setNotifications] = useState<KNotification[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Refs used by the debounced Firestore sync (keep latest values without
  // re-subscribing the timers on every render).
  const userRef = useRef<AppUser | null>(null);
  const epDataRef = useRef<{ episodeData: Record<string, Record<string, EpisodeEntry>>; watched: Record<string, number[]> }>({ episodeData: {}, watched: {} });
  const dirtyEpisodesRef = useRef<Set<string>>(new Set());
  const episodeFlushRef = useRef<number | null>(null);
  const lastLibSyncRef = useRef<Record<string, string>>({});
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics();
    // Client hydration from local-first storage (avoids SSR mismatch by design).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(load<AppUser | null>("kairoku:user", null));
    setLibrary(load("kairoku:library", []));
    setWatched(load<Record<string, number[]>>("kairoku:watched", {}));
    setEpisodeData(loadEpisodeData());
    setReviews(load("kairoku:reviews", []));
    setLists(load("kairoku:lists", []));
    setNotifications(load<KNotification[]>("kairoku:notifs", []));
    // If Firebase configured, attach auth listener lazily
    (async () => {
      if (isFirebaseConfigured && auth) {
        const { onAuthStateChanged } = await import("firebase/auth");
        onAuthStateChanged(auth, (fb) => {
          if (fb) {
            setUser((prev) => {
              if (prev && prev.email === fb.email) return prev;
              const u: AppUser = {
                id: fb.uid,
                username: deriveUsername(fb.email),
                displayName: fb.displayName || (fb.email || "User").split("@")[0],
                email: fb.email || "",
                avatarUrl: fb.photoURL || undefined,
                bio: "",
                timezone:
                  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                createdAt: new Date().toISOString(),
                onboarded: false,
              };
              save("kairoku:user", u);
              return u;
            });
          }
        });
      }
    })();
    setReady(true);
  }, []);

  useEffect(() => save("kairoku:library", library), [library]);
  useEffect(() => save("kairoku:watched", watched), [watched]);
  useEffect(() => save("kairoku:episodeData", episodeData), [episodeData]);
  useEffect(() => save("kairoku:reviews", reviews), [reviews]);
  useEffect(() => save("kairoku:lists", lists), [lists]);
  useEffect(() => save("kairoku:notifs", notifications), [notifications]);
  useEffect(() => {
    if (user) save("kairoku:user", user);
  }, [user]);

  // Keep sync refs current (no state writes, so no cascading renders).
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    epDataRef.current = { episodeData, watched };
  }, [episodeData, watched]);

  // Firestore sync (best-effort, local-first). Wait for the initial pull so we
  // never overwrite a chosen username with a device-local placeholder.
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) return;
    if (!hydrated) return;
    (async () => {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(
          doc(db!, "users", user.id),
          {
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl || null,
            bio: user.bio || "",
            timezone: user.timezone,
            favoriteGenres: user.favoriteGenres ?? null,
            onboarded: user.onboarded ?? false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {}
    })();
  }, [user, hydrated]);

  // Library: write only entries whose updatedAt changed since the last pass.
  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;
    const t = window.setTimeout(() => {
      for (const entry of library) {
        const key = String(entry.animeId);
        if (lastLibSyncRef.current[key] === entry.updatedAt) continue;
        lastLibSyncRef.current[key] = entry.updatedAt;
        void pushLibraryEntry(user.id, entry);
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [library, user]);

  // Lists + reviews: small collections, debounce a full best-effort write.
  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;
    const t = window.setTimeout(() => {
      for (const list of lists) void pushList(user.id, list);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [lists, user]);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;
    const t = window.setTimeout(() => {
      for (const review of reviews) void pushReview(user.id, review);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [reviews, user]);

  // On sign-in, backfill anything this device is missing from Firestore.
  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;
    if (hydratedRef.current === user.id) return;
    hydratedRef.current = user.id;
    let alive = true;
    pullUserData(user.id)
      .then((data) => {
        if (!alive || !data) return;
        // Adopt the profile only when the account was explicitly onboarded,
        // so a device-local placeholder never clobbers a chosen username.
        setUser((prev) => {
          const p = data.profile;
          if (!prev || !p?.onboarded) return prev;
          return {
            ...prev,
            username: p.username || prev.username,
            displayName: p.displayName || prev.displayName,
            bio: p.bio || prev.bio,
            avatarUrl: p.avatarUrl || prev.avatarUrl,
            timezone: p.timezone || prev.timezone,
            favoriteGenres: p.favoriteGenres ?? prev.favoriteGenres,
            onboarded: true,
          };
        });
        setLibrary((prev) => mergeLibrary(prev, data.library));
        setEpisodeData((prev) => mergeEpisodeData(prev, data.episodes));
        setWatched((prev) => mergeWatched(prev, data.episodes));
        setLists((prev) => mergeLists(prev, data.lists));
        setReviews((prev) => mergeReviews(prev, data.reviews));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Queue an episode document for a debounced Firestore write.
  const markEpisodeDirty = useCallback((animeId: number) => {
    dirtyEpisodesRef.current.add(String(animeId));
    if (episodeFlushRef.current) return;
    episodeFlushRef.current = window.setTimeout(() => {
      episodeFlushRef.current = null;
      const u = userRef.current;
      const ids = [...dirtyEpisodesRef.current];
      dirtyEpisodesRef.current.clear();
      if (!u) return;
      const { episodeData: ed, watched: w } = epDataRef.current;
      for (const id of ids) {
        void pushEpisode(u.id, {
          animeId: Number(id),
          watched: w[id] || [],
          entries: ed[id] || {},
          updatedAt: new Date().toISOString(),
        });
      }
    }, 1200);
  }, []);

  const signUp: Store["signUp"] = async (email, password) => {
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    // A placeholder handle; onboarding asks the user to choose the real one.
    const placeholder = deriveUsername(email);
    if (isFirebaseConfigured && auth) {
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: placeholder });
      setUser({
        id: cred.user.uid, username: placeholder, displayName: placeholder, email,
        bio: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        createdAt: new Date().toISOString(),
        onboarded: false,
      });
      return;
    }
    setUser({
      id: uid(), username: placeholder, displayName: placeholder, email,
      bio: "Collecting stories, one episode at a time.",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      createdAt: new Date().toISOString(),
      onboarded: false,
    });
    showToast("Welcome to Kairoku.");
  };

  const signIn: Store["signIn"] = async (usernameOrEmail, password) => {
    if (isFirebaseConfigured && auth && usernameOrEmail.includes("@")) {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, usernameOrEmail, password || "");
      return;
    }
    const existing = load<AppUser | null>("kairoku:user", null);
    if (existing) {
      setUser(existing);
      return;
    }
    const clean = deriveUsername(usernameOrEmail);
    setUser({
      id: uid(), username: clean, displayName: clean, email: usernameOrEmail,
      bio: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      createdAt: new Date().toISOString(),
      onboarded: false,
    });
  };

  const signInGoogle: Store["signInGoogle"] = async () => {
    if (isFirebaseConfigured && auth) {
      const { GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } =
        await import("firebase/auth");
      const cred = await signInWithPopup(auth, new GoogleAuthProvider()).catch((e) => {
        throw new Error(authErrorMessage(e));
      });
      const isNew = getAdditionalUserInfo(cred)?.isNewUser ?? false;
      if (isNew) {
        const base = deriveUsername(cred.user.email);
        setUser({
          id: cred.user.uid,
          username: base,
          displayName: cred.user.displayName || base,
          email: cred.user.email || "",
          avatarUrl: cred.user.photoURL || undefined,
          bio: "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          createdAt: new Date().toISOString(),
          onboarded: false,
        });
      }
      return isNew;
    }
    const existing = load<AppUser | null>("kairoku:user", null);
    if (existing) {
      setUser(existing);
      return false;
    }
    const base = deriveUsername(`guest_${Math.floor(1000 + Math.random() * 9000)}`);
    setUser({
      id: uid(), username: base, displayName: "Watcher",
      email: `${base}@kairoku.app`, bio: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      createdAt: new Date().toISOString(),
      onboarded: false,
    });
    return true;
  };

  const signOut = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
      } catch {}
    }
    setUser(null);
    localStorage.removeItem("kairoku:user");
  };

  const updateProfile = (patch: Partial<AppUser>) =>
    setUser((u) => (u ? { ...u, ...patch } : u));

  const upsertLibrary: Store["upsertLibrary"] = (anime, patch) => {
    setLibrary((prev) => {
      const ex = prev.find((e) => e.animeId === anime.malId);
      if (ex) return prev.map((e) => (e.animeId === anime.malId ? { ...e, ...patch, anime, updatedAt: new Date().toISOString() } : e));
      const entry: LibraryEntry = {
        animeId: anime.malId, anime,
        status: patch.status ?? "plan_to_watch",
        currentEpisode: patch.currentEpisode ?? 0,
        totalEpisodes: anime.episodes ?? null,
        rating: patch.rating ?? 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return [{ ...entry, ...patch }, ...prev];
    });
  };

  const setStatus: Store["setStatus"] = (anime, status) => {
    upsertLibrary(anime, {
      status,
      completedAt: status === "completed" ? new Date().toISOString() : undefined,
    });
    showToast(
      status === "completed" ? "Another story completed." :
      status === "watching" ? "Added to your Kairoku." : "Library updated."
    );
  };

  const setProgress = (animeId: number, ep: number) => {
    setLibrary((prev) => prev.map((e) => e.animeId === animeId ? {
      ...e, currentEpisode: Math.max(0, ep),
      status: e.totalEpisodes && ep >= e.totalEpisodes ? "completed" : e.status === "completed" ? "completed" : e.status,
      completedAt: e.totalEpisodes && ep >= e.totalEpisodes ? new Date().toISOString() : e.completedAt,
      updatedAt: new Date().toISOString(),
    } : e));
  };

  const setAnimeRating = (animeId: number, rating: number) => {
    setLibrary((prev) => prev.map((e) => e.animeId === animeId ? { ...e, rating, updatedAt: new Date().toISOString() } : e));
    showToast("Rating saved.");
  };

  const removeFromLibrary = (animeId: number) =>
    setLibrary((prev) => prev.filter((e) => e.animeId !== animeId));

  const isWatched = (animeId: number, episode: number): boolean => {
    if ((watched[String(animeId)] || []).includes(episode)) return true;
    const entry = library.find((e) => e.animeId === animeId);
    return !!entry && entry.currentEpisode >= episode;
  };

  const getEpisodeEntry: Store["getEpisodeEntry"] = (animeId, episode) =>
    episodeData[String(animeId)]?.[String(episode)];

  const getEpisodeRating: Store["getEpisodeRating"] = (animeId, episode) =>
    getEpisodeEntry(animeId, episode)?.rating || 0;

  const getEpisodeNote: Store["getEpisodeNote"] = (animeId, episode) =>
    getEpisodeEntry(animeId, episode)?.note || "";

  /** Merge a patch into an episode's record; drop the record when it's empty. */
  const writeEpisodeEntry = (
    animeId: number,
    episode: number,
    patch: Partial<EpisodeEntry>
  ) => {
    setEpisodeData((prev) => {
      const forAnime = { ...(prev[String(animeId)] || {}) };
      const current = forAnime[String(episode)] ?? {
        rating: 0,
        note: "",
        updatedAt: "",
      };
      const merged: EpisodeEntry = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      if ((merged.rating || 0) <= 0 && !merged.note?.trim()) {
        delete forAnime[String(episode)];
      } else {
        forAnime[String(episode)] = merged;
      }
      return { ...prev, [String(animeId)]: forAnime };
    });
    markEpisodeDirty(animeId);
  };

  const setEpisodeRating: Store["setEpisodeRating"] = (animeId, episode, rating) => {
    writeEpisodeEntry(animeId, episode, { rating });
    if (rating > 0) showToast(`Episode ${episode} rated.`);
  };

  const setEpisodeNote: Store["setEpisodeNote"] = (animeId, episode, note) => {
    writeEpisodeEntry(animeId, episode, { note });
  };

  const toggleWatched: Store["toggleWatched"] = (anime, episode, total) => {
    const key = String(anime.malId);
    const already = (watched[key] || []).includes(episode);
    setWatched((prev) => {
      const list = prev[key] || [];
      const next = already
        ? list.filter((x) => x !== episode)
        : [...list, episode].sort((a, b) => a - b);
      return { ...prev, [key]: next };
    });
    // Keep library progress coherent with what's been ticked off.
    if (!already) {
      const entry = library.find((e) => e.animeId === anime.malId);
      const reachedEnd = total != null && episode >= total;
      if (!entry) {
        upsertLibrary(anime, {
          status: reachedEnd ? "completed" : "watching",
          currentEpisode: episode,
          completedAt: reachedEnd ? new Date().toISOString() : undefined,
        });
      } else if (episode > entry.currentEpisode || (reachedEnd && entry.status !== "completed")) {
        setLibrary((prev) =>
          prev.map((e) =>
            e.animeId === anime.malId
              ? {
                  ...e,
                  currentEpisode: Math.max(e.currentEpisode, episode),
                  status: reachedEnd ? "completed" : e.status,
                  completedAt: reachedEnd
                    ? new Date().toISOString()
                    : e.completedAt,
                  updatedAt: new Date().toISOString(),
                }
              : e
          )
        );
      }
    }
    markEpisodeDirty(anime.malId);
  };

  const addReview: Store["addReview"] = (r) => {
    const entry: AnimeReview = { ...r, id: uid(), likes: 0, createdAt: new Date().toISOString() };
    setReviews((prev) => [entry, ...prev]);
    showToast("Review published.");
    return entry;
  };

  const toggleLikeReview = (id: string) =>
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, liked: !r.liked, likes: (r.likes || 0) + (r.liked ? -1 : 1) } : r));

  const saveList: Store["saveList"] = (l) => {
    const items = l.items ?? [];
    const animeIds = l.animeIds?.length ? l.animeIds : items.map((a) => a.malId);
    const existing = l.id ? lists.find((x) => x.id === l.id) : undefined;
    const saved: CustomList = existing
      ? { ...existing, ...l, items, animeIds }
      : {
          id: l.id || uid(),
          name: l.name,
          description: l.description ?? "",
          isPublic: l.isPublic ?? true,
          items,
          animeIds,
          createdAt: new Date().toISOString(),
        };
    setLists((prev) =>
      existing
        ? prev.map((x) => (x.id === saved.id ? saved : x))
        : [saved, ...prev]
    );
    showToast(existing ? "List updated." : "List created.");
    return saved;
  };

  const deleteList = (id: string) => {
    setLists((prev) => prev.filter((x) => x.id !== id));
    showToast("List deleted.");
  };

  const addToList: Store["addToList"] = (listId, anime) => {
    let name = "";
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        name = l.name;
        if (l.items?.some((i) => i.malId === anime.malId)) return l;
        const items = [...(l.items || []), anime];
        return { ...l, items, animeIds: items.map((i) => i.malId) };
      })
    );
    showToast(name ? `Added to ${name}.` : "Added to list.");
  };

  const removeFromList: Store["removeFromList"] = (listId, animeId) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const items = (l.items || []).filter((i) => i.malId !== animeId);
        return { ...l, items, animeIds: items.map((i) => i.malId) };
      })
    );
    showToast("Removed from list.");
  };

  const hasInList: Store["hasInList"] = (listId, animeId) =>
    !!lists.find((l) => l.id === listId)?.items?.some((i) => i.malId === animeId);
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  // Notify when an airing title you're watching has a new episode out.
  const syncAiringNotifications: Store["syncAiringNotifications"] = async () => {
    const watching = library.filter(
      (e) => e.anime?.airing && e.status === "watching"
    );
    if (!watching.length) return;

    const fresh: KNotification[] = [];
    await Promise.all(
      watching.map(async (entry) => {
        const anime = entry.anime!;
        try {
          const { latest } = await getAiringInfo(anime.malId);
          if (!latest || latest.number <= (entry.currentEpisode || 0)) return;
          fresh.push({
            id: uid(),
            type: "episode",
            title: `${anime.title} — Episode ${latest.number} is out`,
            body: `You're on episode ${entry.currentEpisode || 0}${
              latest.airDate
                ? ` · aired ${new Date(latest.airDate).toLocaleDateString()}`
                : ""
            }`,
            read: false,
            createdAt: new Date().toISOString(),
            animeId: anime.malId,
            episodeNumber: latest.number,
          });
        } catch {}
      })
    );
    if (!fresh.length) return;

    setNotifications((prev) => {
      const seen = new Set(
        prev
          .filter((n) => n.type === "episode")
          .map((n) => `${n.animeId}:${n.episodeNumber}`)
      );
      const added = fresh.filter(
        (n) => !seen.has(`${n.animeId}:${n.episodeNumber}`)
      );
      return added.length ? [...added, ...prev] : prev;
    });
  };

  // Run the airing check at most once every few hours per browser.
  useEffect(() => {
    if (!ready || !user || library.length === 0) return;
    try {
      const last = Number(localStorage.getItem("kairoku:airingSyncedAt") || 0);
      if (Date.now() - last < AIRING_SYNC_TTL) return;
      localStorage.setItem("kairoku:airingSyncedAt", String(Date.now()));
    } catch {
      return;
    }
    // The state updates happen asynchronously after the network round-trip;
    // this is a background sync, not a synchronous render-loop trigger.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncAiringNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, library.length]);

  const value = useMemo<Store>(
    () => ({
      user, ready, firebaseMode: isFirebaseConfigured,
      signIn, signUp, signInGoogle, signOut, updateProfile,
      library, upsertLibrary, setStatus, setProgress, setAnimeRating, removeFromLibrary,
      watched, isWatched, toggleWatched,
      episodeData, getEpisodeEntry, getEpisodeRating, getEpisodeNote, setEpisodeRating, setEpisodeNote,
      reviews, addReview, toggleLikeReview,
      lists, saveList, deleteList, addToList, removeFromList, hasInList,
      notifications, markAllRead, syncAiringNotifications, toast, showToast,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, ready, library, watched, episodeData, reviews, lists, notifications, toast]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}
