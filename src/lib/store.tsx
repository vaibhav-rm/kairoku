"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Anime,
  AnimeReview,
  AppUser,
  CustomList,
  KNotification,
  LibraryEntry,
  LibraryStatus,
} from "@/types";
import { auth, db, initAnalytics, isFirebaseConfigured } from "@/lib/firebase";
import { getAiringInfo } from "@/lib/airing";

interface Store {
  user: AppUser | null;
  ready: boolean;
  firebaseMode: boolean;
  signIn: (usernameOrEmail: string, password?: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
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
  /** Per-episode star ratings: animeId -> episode -> 0..5 (0 = unrated). */
  episodeRatings: Record<string, Record<string, number>>;
  getEpisodeRating: (animeId: number, episode: number) => number;
  setEpisodeRating: (animeId: number, episode: number, rating: number) => void;
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

const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** How long to wait between airing checks for new episodes. */
const AIRING_SYNC_TTL = 1000 * 60 * 60 * 3;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [watched, setWatched] = useState<Record<string, number[]>>({});
  const [episodeRatings, setEpisodeRatings] = useState<
    Record<string, Record<string, number>>
  >({});
  const [reviews, setReviews] = useState<AnimeReview[]>([]);
  const [lists, setLists] = useState<CustomList[]>([]);
  const [notifications, setNotifications] = useState<KNotification[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    initAnalytics();
    // Client hydration from local-first storage (avoids SSR mismatch by design).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(load<AppUser | null>("kairoku:user", null));
    setLibrary(load("kairoku:library", []));
    setWatched(load<Record<string, number[]>>("kairoku:watched", {}));
    setEpisodeRatings(
      load<Record<string, Record<string, number>>>("kairoku:episodeRatings", {})
    );
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
                username: (fb.email || "user").split("@")[0].toLowerCase(),
                displayName: fb.displayName || (fb.email || "User").split("@")[0],
                email: fb.email || "",
                avatarUrl: fb.photoURL || undefined,
                bio: "",
                timezone:
                  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                createdAt: new Date().toISOString(),
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
  useEffect(() => save("kairoku:episodeRatings", episodeRatings), [episodeRatings]);
  useEffect(() => save("kairoku:reviews", reviews), [reviews]);
  useEffect(() => save("kairoku:lists", lists), [lists]);
  useEffect(() => save("kairoku:notifs", notifications), [notifications]);
  useEffect(() => {
    if (user) save("kairoku:user", user);
  }, [user]);

  // Firestore sync (best-effort, local-first)
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) return;
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
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {}
    })();
  }, [user]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const validateUsername = (u: string) => /^[a-z0-9_]{3,20}$/.test(u.toLowerCase());

  const signUp: Store["signUp"] = async (username, email, password) => {
    const clean = username.toLowerCase().trim();
    if (!validateUsername(clean)) throw new Error("Username must be 3–20 chars: letters, numbers, underscore.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    if (isFirebaseConfigured && auth) {
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: clean });
      const u: AppUser = {
        id: cred.user.uid, username: clean, displayName: clean, email,
        bio: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        createdAt: new Date().toISOString(),
      };
      setUser(u);
      return;
    }
    const u: AppUser = {
      id: uid(), username: clean, displayName: clean, email,
      bio: "Collecting stories, one episode at a time.",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      createdAt: new Date().toISOString(),
    };
    setUser(u);
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
    const clean = usernameOrEmail.split("@")[0].toLowerCase() || "traveler";
    setUser({
      id: uid(), username: clean, displayName: clean, email: usernameOrEmail,
      bio: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      createdAt: new Date().toISOString(),
    });
  };

  const signInGoogle: Store["signInGoogle"] = async () => {
    if (isFirebaseConfigured && auth) {
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      await signInWithPopup(auth, new GoogleAuthProvider());
      return;
    }
    const existing = load<AppUser | null>("kairoku:user", null);
    if (existing) {
      setUser(existing);
      return;
    }
    setUser({
      id: uid(), username: "traveler", displayName: "Traveler",
      email: "traveler@kairoku.app", bio: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      createdAt: new Date().toISOString(),
    });
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
    // best-effort firestore
    if (isFirebaseConfigured && db && user) {
      (async () => {
        try {
          const { doc, setDoc } = await import("firebase/firestore");
          await setDoc(doc(db!, "users", user.id, "library", String(anime.malId)), {
            animeId: anime.malId, status: patch.status ?? "plan_to_watch",
            currentEpisode: patch.currentEpisode ?? 0,
            personalRating: patch.rating ?? 0,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch {}
      })();
    }
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

  const getEpisodeRating: Store["getEpisodeRating"] = (animeId, episode) =>
    episodeRatings[String(animeId)]?.[String(episode)] || 0;

  const setEpisodeRating: Store["setEpisodeRating"] = (animeId, episode, rating) => {
    setEpisodeRatings((prev) => {
      const forAnime = { ...(prev[String(animeId)] || {}) };
      if (rating > 0) forAnime[String(episode)] = rating;
      else delete forAnime[String(episode)];
      return { ...prev, [String(animeId)]: forAnime };
    });
    if (rating > 0) showToast(`Episode ${episode} rated.`);
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
      episodeRatings, getEpisodeRating, setEpisodeRating,
      reviews, addReview, toggleLikeReview,
      lists, saveList, deleteList, addToList, removeFromList, hasInList,
      notifications, markAllRead, syncAiringNotifications, toast, showToast,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, ready, library, watched, episodeRatings, reviews, lists, notifications, toast]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}
