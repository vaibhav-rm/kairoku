"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { searchAnime } from "@/lib/anime-api";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { claimUsername, isUsernameTaken } from "@/lib/sync";
import type { Anime, LibraryStatus } from "@/types";
import { Button, Input } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function OnboardingPage() {
  const { user, ready, setStatus, updateProfile } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [unameErr, setUnameErr] = useState("");
  const [checking, setChecking] = useState(false);
  const seededRef = useRef(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [picked, setPicked] = useState<Anime[]>([]);
  const [statuses, setStatuses] = useState<Record<number, LibraryStatus>>({});
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    if (ready && !user) router.replace("/signup");
  }, [ready, user, router]);

  // Pre-fill the handle once from the account, then leave it to the user.
  useEffect(() => {
    if (seededRef.current || !user) return;
    seededRef.current = true;
    setUsername(user.username || "");
  }, [user]);

  useEffect(() => {
    const query = q.trim();
    if (!query) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const found = await searchAnime(query);
      if (!cancelled) setResults(found); // ignore answers for older queries
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  if (!mounted || !ready || !user) return null;

  const cleanUsername = username.trim().toLowerCase();
  const usernameValid = USERNAME_RE.test(cleanUsername);

  const saveUsername = async () => {
    if (!usernameValid) {
      setUnameErr("3–20 characters: letters, numbers, underscore.");
      return;
    }
    setChecking(true);
    try {
      if (await isUsernameTaken(cleanUsername, user.id)) {
        setUnameErr("That username is taken — try another.");
        return;
      }
      updateProfile({ username: cleanUsername, onboarded: true });
      void claimUsername(cleanUsername, user.id);
      setStep(2);
    } finally {
      setChecking(false);
    }
  };

  const togglePick = (a: Anime) =>
    setPicked((p) => (p.some((x) => x.animeId === a.animeId) ? p.filter((x) => x.animeId !== a.animeId) : [...p, a]));

  return (
    <div className="mx-auto max-w-2xl pt-8">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? "bg-[#e4572e]" : "bg-white/10"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="mt-8">
          <h1 className="serif text-4xl text-zinc-50">Choose your handle.</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This is how you&apos;ll show up on Kairoku — ratings, lists and your profile.
          </p>
          <div className="mt-5">
            <label htmlFor="ob-u" className="text-xs text-zinc-400">Username</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg text-zinc-500">@</span>
              <Input
                id="ob-u"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setUnameErr(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") void saveUsername(); }}
                placeholder="e.g. frieren_fan"
                autoComplete="username"
                autoFocus
                aria-invalid={Boolean(unameErr)}
              />
            </div>
            {unameErr ? (
              <p role="alert" className="mt-1 text-xs text-red-400">{unameErr}</p>
            ) : username && !usernameValid ? (
              <p className="mt-1 text-xs text-amber-300">3–20 characters: letters, numbers, underscore.</p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">You can change this later in Settings.</p>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={saveUsername} disabled={!usernameValid || checking}>
              {checking ? "Checking…" : "Continue"} <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8">
          <h1 className="serif text-4xl text-zinc-50">What are you watching?</h1>
          <p className="mt-2 text-sm text-zinc-400">Search and pick as many as you like.</p>
          <Input
            value={q}
            onChange={(e) => {
              const value = e.target.value;
              setQ(value);
              if (!value.trim()) setResults([]);
            }}
            placeholder="Search anime…"
            className="mt-5"
            aria-label="Search anime to add"
          />
          <div className="mt-4 space-y-2">
            {results.map((a) => {
              const on = picked.some((x) => x.animeId === a.animeId);
              return (
                <button key={a.animeId} onClick={() => togglePick(a)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition cursor-pointer ${on ? "border-[#e4572e]/60 bg-[#e4572e]/10" : "border-white/10 bg-[#171412]"}`}>
                  <SafeImage src={a.coverImage} alt="" className="h-14 w-10 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">{a.title}</span>
                  {on && <Check size={16} className="shrink-0 text-[#e4572e]" />}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => router.push("/home")}>Skip</Button>
            <Button onClick={() => setStep(3)} disabled={picked.length === 0}>
              Continue ({picked.length}) <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-8">
          <h1 className="serif text-4xl text-zinc-50">Where are you right now?</h1>
          <div className="mt-5 space-y-3">
            {picked.map((a) => (
              <div key={a.animeId} className="rounded-2xl border border-white/10 bg-[#171412] p-4">
                <p className="text-sm font-medium text-zinc-100">{a.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["watching", "plan_to_watch", "completed", "paused", "dropped"] as LibraryStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatuses((m) => ({ ...m, [a.animeId]: s }))}
                      className={`rounded-full px-3 py-2 text-xs capitalize cursor-pointer max-sm:min-h-10 ${statuses[a.animeId] === s ? "bg-[#e4572e] text-white" : "border border-white/10 text-zinc-400"}`}
                    >
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button
              onClick={() => {
                picked.forEach((a) => setStatus(a, statuses[a.animeId] || "watching"));
                setStep(4);
              }}
            >
              Continue <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-8">
          <h1 className="serif text-4xl text-zinc-50">Tell us what you love.</h1>
          <p className="mt-2 text-sm text-zinc-400">Optional — helps recommendations feel personal.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Action", "Adventure", "Fantasy", "Drama", "Romance", "Comedy", "Sci-Fi", "Slice of Life", "Mystery", "Sports"].map((g) => (
              <button
                key={g}
                onClick={() => setGenres((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]))}
                className={`rounded-full px-4 py-2 text-sm cursor-pointer max-sm:min-h-10 ${genres.includes(g) ? "bg-[#e4572e] text-white" : "border border-white/10 text-zinc-300"}`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(5)}>Skip</Button>
              <Button
                onClick={() => {
                  updateProfile({ favoriteGenres: genres });
                  setStep(5);
                }}
              >
                Continue <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="mt-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#e4572e]">ようこそ · Welcome</p>
          <h1 className="serif mt-2 text-4xl text-zinc-50">Welcome to Kairoku, @{user.username}.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
            {picked.length > 0
              ? `Your library starts with ${picked.length} ${picked.length === 1 ? "story" : "stories"}. Mark episodes watched as you go — we'll count down to the next one for you.`
              : "Your shelf is empty and full of possibility. Let's find your first story."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => router.push("/home")} className="px-8 py-3 max-sm:w-full">Open your library</Button>
            <Button variant="outline" onClick={() => router.push("/discover")} className="px-8 py-3 max-sm:w-full">Discover anime</Button>
          </div>
        </div>
      )}
    </div>
  );
}
