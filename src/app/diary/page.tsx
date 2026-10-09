"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { animeSlug } from "@/lib/utils";
import { Button, EmptyState, Input, Stars, Textarea, StarsDisplay } from "@/components/ui";

const FILTERS = ["All", "Reviews", "Episode entries", "Anime completions", "Ratings"] as const;

export default function DiaryPage() {
  const { user, ready, logs, reviews, library, addLog } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [quickOpen, setQuickOpen] = useState(false);
  const [qAnime, setQAnime] = useState("");
  const [qEp, setQEp] = useState("1");
  const [qRating, setQRating] = useState(0);
  const [qNote, setQNote] = useState("");

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!mounted || !ready) return null;
  if (!user) return null;

  const completionItems = library
    .filter((e) => e.status === "completed")
    .map((e) => ({ kind: "completion" as const, at: e.completedAt || e.updatedAt, entry: e }));

  type Item =
    | { kind: "log"; at: string; id: string }
    | { kind: "review"; at: string; id: string }
    | { kind: "completion"; at: string; id: string };

  const items: Item[] = [
    ...logs.map((l) => ({ kind: "log" as const, at: l.createdAt, id: l.id })),
    ...reviews.map((r) => ({ kind: "review" as const, at: r.createdAt, id: r.id })),
    ...completionItems.map((c) => ({ kind: "completion" as const, at: c.at, id: String(c.entry.animeId) })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const filtered = items.filter((it) => {
    if (filter === "All") return true;
    if (filter === "Reviews") return it.kind === "review";
    if (filter === "Episode entries") return it.kind === "log";
    if (filter === "Anime completions") return it.kind === "completion";
    if (filter === "Ratings") return it.kind === "log" || it.kind === "review";
    return true;
  });

  const byDate = new Map<string, Item[]>();
  for (const it of filtered) {
    const d = new Date(it.at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(it);
  }

  const watching = library.filter((e) => e.status === "watching");

  return (
    <div className="mx-auto max-w-2xl pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e4572e]">日記 · Diary</p>
      <div className="mt-1 flex items-end justify-between">
        <h1 className="display serif text-3xl text-zinc-50 sm:text-4xl">Your anime diary.</h1>
        <Button onClick={() => setQuickOpen((v) => !v)} className="!px-4">
          <Plus size={15} /> Log something
        </Button>
      </div>

      {quickOpen && (
        <div className="mt-5 rounded-2xl border border-[#e4572e]/30 bg-[#1a1412] p-5">
          <p className="text-sm font-medium text-zinc-100">Quick log — under 10 seconds.</p>
          {watching.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400">Add an anime to your library first, then log here instantly.</p>
          ) : (
            <>
              <select
                value={qAnime}
                onChange={(e) => setQAnime(e.target.value)}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-zinc-100"
                aria-label="Anime"
              >
                <option value="">Select anime…</option>
                {watching.map((e) => (
                  <option key={e.animeId} value={e.animeId} className="bg-zinc-900">{e.anime?.title} (Ep {e.currentEpisode})</option>
                ))}
              </select>
              <div className="mt-3 flex items-center gap-3">
                <Input type="number" min={1} value={qEp} onChange={(e) => setQEp(e.target.value)} className="!w-24" aria-label="Episode number" />
                <Stars value={qRating} onRate={setQRating} label="Quick log rating" />
              </div>
              <Textarea value={qNote} onChange={(e) => setQNote(e.target.value)} placeholder="One line you'll want to remember…" className="mt-3 min-h-[80px]" aria-label="Quick note" />
              <Button
                className="mt-3 w-full"
                onClick={() => {
                  const e = watching.find((x) => x.animeId === Number(qAnime));
                  if (!e?.anime) return;
                  addLog({
                    animeId: e.animeId, animeTitle: e.anime.title, coverImage: e.anime.coverImage,
                    episodeNumber: Number(qEp) || e.currentEpisode + 1, rating: qRating || 5,
                    note: qNote, isPublic: false, spoilers: false,
                    date: new Date().toISOString().slice(0, 10),
                  });
                  setQuickOpen(false); setQNote(""); setQRating(0);
                }}
              >
                Log episode
              </Button>
            </>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Diary filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition cursor-pointer ${filter === f ? "bg-[#e4572e] text-white" : "border border-white/10 text-zinc-400 hover:text-white"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Your story starts here."
            body="Log your first episode and it will live here — private by default, publishable when you want."
            action={<Button onClick={() => setQuickOpen(true)}>Log your first episode</Button>}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {[...byDate.entries()].map(([date, list]) => (
            <section key={date}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">{date}</h2>
              <div className="mt-3 space-y-3 border-l-2 border-white/10 pl-4">
                {list.map((it) => {
                  if (it.kind === "log") {
                    const l = logs.find((x) => x.id === it.id)!;
                    if (!l) return null;
                    return (
                      <article key={it.id} className="rounded-2xl border border-white/10 bg-[#171412] p-4">
                        <Link href={`/anime/${animeSlug(l.animeId, l.animeTitle)}/episode/${l.episodeNumber}`} className="font-medium text-zinc-100 hover:underline">
                          {l.animeTitle} — Episode {l.episodeNumber}
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          <StarsDisplay value={l.rating} />
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                            {l.isPublic ? <><Eye size={11} /> Public</> : <><EyeOff size={11} /> Private</>}
                          </span>
                        </div>
                        {l.note && <p className="serif mt-2 text-lg italic leading-relaxed text-zinc-100">“{l.note}”</p>}
                      </article>
                    );
                  }
                  if (it.kind === "review") {
                    const r = reviews.find((x) => x.id === it.id)!;
                    if (!r) return null;
                    return (
                      <article key={it.id} className="rounded-2xl border border-white/10 bg-[#171412] p-4">
                        <p className="text-xs uppercase tracking-widest text-[#e4572e]">Review · {r.animeTitle}</p>
                        <h3 className="serif mt-1 text-lg text-zinc-50">{r.title}</h3>
                        <StarsDisplay value={r.rating} />
                        <p className="mt-2 line-clamp-3 text-sm text-zinc-300">{r.body}</p>
                      </article>
                    );
                  }
                  const c = completionItems.find((x) => String(x.entry.animeId) === it.id);
                  if (!c) return null;
                  return (
                    <div key={it.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-200">
                      Another story completed — <span className="font-semibold">{c.entry.anime?.title}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
