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
  EpisodeLog,
  KNotification,
  LibraryEntry,
  LibraryStatus,
} from "@/types";
import { auth, db, initAnalytics, isFirebaseConfigured } from "@/lib/firebase";

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
  logs: EpisodeLog[];
  addLog: (log: Omit<EpisodeLog, "id" | "createdAt">) => EpisodeLog;
  reviews: AnimeReview[];
  addReview: (r: Omit<AnimeReview, "id" | "createdAt" | "likes">) => AnimeReview;
  toggleLikeReview: (id: string) => void;
  lists: CustomList[];
  saveList: (l: Omit<CustomList, "id" | "createdAt"> & { id?: string }) => void;
  deleteList: (id: string) => void;
  notifications: KNotification[];
  markAllRead: () => void;
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

function seedNotifications(): KNotification[] {
  return [
    {
      id: uid(),
      type: "episode",
      title: "Episode 1147 of One Piece is out",
      body: "Tomorrow · 7:30 PM your time",
      read: false,
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      animeId: 21,
    },
    {
      id: uid(),
      type: "episode",
      title: "Episode 13 of Dandadan airs soon",
      body: "Releases in 2d 4h",
      read: false,
      createdAt: new Date(Date.now() - 3600000 * 9).toISOString(),
      animeId: 60489,
    },
  ];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [logs, setLogs] = useState<EpisodeLog[]>([]);
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
    setLogs(load("kairoku:logs", []));
    setReviews(load("kairoku:reviews", []));
    setLists(load("kairoku:lists", []));
    const n = load<KNotification[] | null>("kairoku:notifs", null);
    setNotifications(n ?? seedNotifications());
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
  useEffect(() => save("kairoku:logs", logs), [logs]);
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
    showToast("Added to your diary.");
  };

  const removeFromLibrary = (animeId: number) =>
    setLibrary((prev) => prev.filter((e) => e.animeId !== animeId));

  const addLog: Store["addLog"] = (log) => {
    const entry: EpisodeLog = { ...log, id: uid(), createdAt: new Date().toISOString() };
    setLogs((prev) => [entry, ...prev]);
    setLibrary((prev) => prev.map((e) => e.animeId === log.animeId ? {
      ...e, currentEpisode: Math.max(e.currentEpisode, log.episodeNumber), updatedAt: new Date().toISOString(),
    } : e));
    showToast(log.isPublic ? "Published to your diary." : "You finished another episode.");
    return entry;
  };

  const addReview: Store["addReview"] = (r) => {
    const entry: AnimeReview = { ...r, id: uid(), likes: 0, createdAt: new Date().toISOString() };
    setReviews((prev) => [entry, ...prev]);
    showToast("Added to your diary.");
    return entry;
  };

  const toggleLikeReview = (id: string) =>
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, liked: !r.liked, likes: (r.likes || 0) + (r.liked ? -1 : 1) } : r));

  const saveList: Store["saveList"] = (l) => {
    if (l.id) setLists((prev) => prev.map((x) => x.id === l.id ? { ...x, ...l } as CustomList : x));
    else setLists((prev) => [{ ...l, id: uid(), createdAt: new Date().toISOString() }, ...prev]);
    showToast("List saved.");
  };
  const deleteList = (id: string) => setLists((prev) => prev.filter((x) => x.id !== id));
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const value = useMemo<Store>(
    () => ({
      user, ready, firebaseMode: isFirebaseConfigured,
      signIn, signUp, signInGoogle, signOut, updateProfile,
      library, upsertLibrary, setStatus, setProgress, setAnimeRating, removeFromLibrary,
      logs, addLog, reviews, addReview, toggleLikeReview,
      lists, saveList, deleteList, notifications, markAllRead, toast, showToast,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, ready, library, logs, reviews, lists, notifications, toast]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}
