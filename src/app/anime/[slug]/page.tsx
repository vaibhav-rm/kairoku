"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Bookmark, Check, Minus, PenLine, Plus, ListPlus, Play } from "lucide-react";
import { getAnime, getAnimeEpisodes } from "@/lib/anime-api";
import { malIdFromSlug, animeSlug, timeUntil } from "@/lib/utils";
import type { Anime, Episode } from "@/types";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Badge, Button, EmptyState, Skeleton, Stars, ProgressBar, Textarea, Input } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

/** First episode that hasn't aired yet (used for the countdown). */
function firstUpcoming(eps: Episode[]): Episode | null {
  const now = Date.now();
  return eps.find((e) => e.airDate && new Date(e.airDate).getTime() > now) ?? null;
}

const STATUSES = [
  ["watching", "Watching"],
  ["completed", "Completed"],
  ["plan_to_watch", "Want to Watch"],
  ["paused", "Paused"],
  ["dropped", "Dropped"],
] as const;

export default function AnimeDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const malId = malIdFromSlug(slug);
  const mounted = useMounted();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [epPage, setEpPage] = useState(1);
  const [epHasNext, setEpHasNext] = useState(false);
  const [epLoading, setEpLoading] = useState(false);
  const [nextAiringEp, setNextAiringEp] = useState<Episode | null>(null);
  const [failed, setFailed] = useState(false);
  const {
    library, setStatus, setProgress, setAnimeRating, logs, reviews, addReview,
    isWatched, toggleWatched, lists, saveList, addToList, removeFromList, hasInList,
  } = useStore();
  const entry = library.find((e) => e.animeId === malId);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rTitle, setRTitle] = useState("");
  const [rBody, setRBody] = useState("");
  const [rRating, setRRating] = useState(0);
  const [rSpoiler, setRSpoiler] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  useEffect(() => {
    if (!malId) return;
    getAnime(malId).then((a) => {
      if (a) setAnime(a);
      else setFailed(true);
    });
    getAnimeEpisodes(malId, 1)
      .then((r) => {
        setEpisodes(r.episodes);
        setEpHasNext(r.hasNext);
        setEpPage(1);
        setNextAiringEp(firstUpcoming(r.episodes));
      })
      .catch(() => {});
  }, [malId]);

  const loadMoreEpisodes = async () => {
    if (!malId || epLoading || !epHasNext) return;
    setEpLoading(true);
    try {
      const next = await getAnimeEpisodes(malId, epPage + 1);
      const seen = new Set(episodes.map((e) => e.number));
      const merged = [...episodes, ...next.episodes.filter((e) => !seen.has(e.number))];
      setEpisodes(merged);
      setNextAiringEp(firstUpcoming(merged));
      setEpHasNext(next.hasNext);
      setEpPage((p) => p + 1);
    } finally {
      setEpLoading(false);
    }
  };

  if (!malId || failed)
    return (
      <div className="pt-10">
        <EmptyState
          title="Something went wrong."
          body="We couldn't load this anime right now."
          action={<Button onClick={() => location.reload()}>Try again</Button>}
        />
      </div>
    );

  if (!anime)
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );

  const total = anime.episodes ?? entry?.totalEpisodes ?? null;
  const animeReviews = reviews.filter((r) => r.animeId === anime.malId);
  const epLogs = logs.filter((l) => l.animeId === anime.malId);

  // "Up next": the first episode we haven't ticked off (or next after progress).
  const highestWatched = Math.max(
    entry?.currentEpisode ?? 0,
    ...episodes.filter((e) => isWatched(anime.malId, e.number)).map((e) => e.number),
    0
  );
  const upNext = total && highestWatched >= total ? total : highestWatched + 1;

  // The provider lists don't expose a "next episode"; the loader derives it
  // from real episode air dates so airing shows count down accurately.
  const nextEpisode = nextAiringEp
    ? { number: nextAiringEp.number, airsAt: nextAiringEp.airDate! }
    : anime.nextEpisode;

  return (
    <div className="-mx-4 sm:-mx-6">
      {/* HERO */}
      <section className="grain relative overflow-hidden">
        <div className="absolute inset-0">
          <SafeImage src={anime.bannerImage || anime.coverImage} alt="" className="kenburns h-full w-full object-cover object-top opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0e0c]/50 via-[#0f0e0c]/85 to-[#0f0e0c]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f0e0c]/70 to-transparent" />
        </div>
        {anime.titleJapanese && (
          <span aria-hidden className="tategaki absolute right-6 top-10 hidden select-none text-sm text-zinc-600 xl:block">
            {anime.titleJapanese}
          </span>
        )}
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-16 sm:px-6 md:grid-cols-[220px_1fr] md:pt-24">
          <SafeImage
            src={anime.coverImage}
            alt={anime.title}
            className="card-lift w-40 rounded-2xl border border-white/20 shadow-2xl md:w-full"
          />
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              {anime.year && <span>{anime.year}</span>}
              {anime.type && <span className="text-[#e4572e]">· {anime.type}</span>}
              {anime.status && <span>· {anime.status}</span>}
              {anime.episodes ? <span>· {anime.episodes} eps</span> : null}
            </div>
            <h1 className="display serif mt-3 text-4xl leading-[1.02] text-zinc-50 sm:text-6xl">{anime.title}</h1>
            {anime.titleJapanese && (
              <p className="mt-2 text-sm tracking-[0.2em] text-zinc-500">{anime.titleJapanese}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
              {anime.score != null && (
                <span className="flex items-baseline gap-2">
                  <span className="serif text-5xl tabular-nums text-amber-300">{anime.score.toFixed(2)}</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Score{anime.scoredBy ? <><br />{(anime.scoredBy / 1000).toFixed(0)}k votes</> : null}
                  </span>
                </span>
              )}
              <span className="flex flex-wrap gap-1.5">
                {anime.genres.map((g) => (
                  <Badge key={g}>{g}</Badge>
                ))}
              </span>
              {anime.studios[0] && <Badge className="border-[#e4572e]/40 text-[#e89a7c]">{anime.studios[0]}</Badge>}
            </div>
            {anime.synopsis && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-[15px]">
                {anime.synopsis.replace(/\[Written by.*?\]/, "")}
              </p>
            )}
            {nextEpisode && (
              <p className="mt-3 text-sm text-zinc-300">
                Next · Episode {nextEpisode.number} ·{" "}
                <span className="text-[#e4572e] font-semibold">
                  {mounted ? timeUntil(nextEpisode.airsAt) : "···"}
                </span>
                {nextAiringEp?.airDate && mounted
                  ? ` · ${new Date(nextAiringEp.airDate).toLocaleDateString()}`
                  : ""}
              </p>
            )}
            {/* Actions */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {!entry ? (
                <>
                  <Button onClick={() => setStatus(anime, "watching")}>
                    <Plus size={15} /> Add to Kairoku
                  </Button>
                  <Button variant="outline" onClick={() => setStatus(anime, "plan_to_watch")}>
                    <Bookmark size={15} /> Watchlist
                  </Button>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {STATUSES.map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setStatus(anime, v)}
                      className={`rounded-full px-4 py-2 text-xs font-medium transition cursor-pointer ${entry.status === v ? "bg-[#e4572e] text-white" : "border border-white/12 text-zinc-300 hover:bg-white/10"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <Button variant="soft" onClick={() => setReviewOpen((v) => !v)}>
                <PenLine size={15} /> Write something about it
              </Button>
              <Button variant="soft" onClick={() => setListOpen((v) => !v)} aria-expanded={listOpen}>
                <ListPlus size={15} /> Add to list
              </Button>
            </div>

            {/* Add to list */}
            {listOpen && (
              <div className="mt-4 max-w-md rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Your lists</p>
                {lists.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-400">No lists yet — create your first one below.</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {lists.map((l) => {
                      const on = hasInList(l.id, anime.malId);
                      return (
                        <label key={l.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm text-zinc-200 hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) => (e.target.checked ? addToList(l.id, anime) : removeFromList(l.id, anime.malId))}
                            className="size-4 accent-[#e4572e]"
                          />
                          <span className="flex-1 truncate">{l.name}</span>
                          <span className="text-xs text-zinc-500">{l.animeIds.length}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New list name…" aria-label="New list name" />
                  <Button
                    onClick={() => {
                      if (!newListName.trim()) return;
                      saveList({ name: newListName.trim(), description: "", isPublic: true, animeIds: [], items: [anime] });
                      setNewListName("");
                    }}
                  >
                    Create
                  </Button>
                </div>
              </div>
            )}

            {/* Personal progress */}
            {!entry && (
              <div className="mt-5">
                <Button onClick={() => toggleWatched(anime, upNext, total)}>
                  <Check size={15} /> Mark episode {upNext} watched
                </Button>
              </div>
            )}
            {entry && (
              <div className="mt-5 max-w-md rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Your progress</p>
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={() => setProgress(anime.malId, entry.currentEpisode - 1)} className="grid size-9 place-items-center rounded-full border border-white/15 hover:bg-white/10 cursor-pointer" aria-label="Decrease episode">
                    <Minus size={15} />
                  </button>
                  <p className="text-lg tabular-nums text-zinc-100">
                    Episode {entry.currentEpisode}{total ? ` / ${total}` : ""}
                  </p>
                  <button onClick={() => setProgress(anime.malId, entry.currentEpisode + 1)} className="grid size-9 place-items-center rounded-full border border-white/15 hover:bg-white/10 cursor-pointer" aria-label="Increase episode">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="mt-3"><ProgressBar value={entry.currentEpisode} total={total} /></div>
                <div className="mt-3">
                  <p className="mb-1 text-xs text-zinc-500">Your rating</p>
                  <Stars value={entry.rating} onRate={(v) => setAnimeRating(anime.malId, v)} label={`Rate ${anime.title}`} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/anime/${animeSlug(anime.malId, anime.title)}/episode/${upNext}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#e4572e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#cf4a24]"
                  >
                    <Play size={12} fill="currentColor" /> Continue · Episode {upNext}
                  </Link>
                  <span className="text-xs text-zinc-500">
                    {highestWatched} watched{total ? ` of ${total}` : ""}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        {/* Review composer */}
        {reviewOpen && (
          <div className="rounded-2xl border border-[#e4572e]/30 bg-[#1a1412] p-5">
            <h3 className="serif text-xl text-zinc-50">Write something about it</h3>
            <div className="mt-3"><Stars value={rRating} onRate={setRRating} label="Anime rating" /></div>
            <Input value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Review title — e.g. A beautiful ending…" className="mt-3" aria-label="Review title" />
            <Textarea value={rBody} onChange={(e) => setRBody(e.target.value)} placeholder="What will you want to remember about this story?" className="mt-3" aria-label="Review body" />
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={rSpoiler} onChange={(e) => setRSpoiler(e.target.checked)} className="size-4 accent-[#e4572e]" />
              Contains spoilers
            </label>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => {
                  if (!rBody.trim() && !rTitle.trim()) return;
                  addReview({ animeId: anime.malId, animeTitle: anime.title, coverImage: anime.coverImage, rating: rRating || 5, title: rTitle || "Untitled", body: rBody, spoilers: rSpoiler });
                  setRTitle(""); setRBody(""); setRRating(0); setReviewOpen(false);
                }}
              >
                <Check size={15} /> Publish review
              </Button>
              <Button variant="ghost" onClick={() => setReviewOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Episodes */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="serif text-2xl text-zinc-50">Episodes</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {highestWatched}{total ? ` / ${total}` : ""} watched
              </span>
              {total && (
                <Link
                  href={`/anime/${animeSlug(anime.malId, anime.title)}/episode/${upNext}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-zinc-100 hover:bg-white/5"
                >
                  <Play size={12} fill="currentColor" /> Up next: Ep {upNext}
                </Link>
              )}
            </div>
          </div>
          {episodes.length === 0 ? (
            <div className="mt-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (
            <>
              <ol className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-[#141110]">
                {episodes.map((ep) => {
                  const log = epLogs.find((l) => l.episodeNumber === ep.number);
                  const watched = isWatched(anime.malId, ep.number);
                  return (
                    <li key={ep.number} className="flex items-center gap-2 pr-3 transition hover:bg-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => toggleWatched(anime, ep.number, total)}
                        aria-pressed={watched}
                        aria-label={`Mark episode ${ep.number} ${watched ? "unwatched" : "watched"}`}
                        className={`ml-3 grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold transition cursor-pointer ${watched ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "bg-white/[0.06] text-zinc-400 hover:bg-white/15"}`}
                      >
                        {watched ? <Check size={15} /> : ep.number}
                      </button>
                      <Link
                        href={`/anime/${animeSlug(anime.malId, anime.title)}/episode/${ep.number}`}
                        className="flex min-w-0 flex-1 items-center gap-3 py-3.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-medium ${watched ? "text-zinc-400" : "text-zinc-100"}`}>
                            Episode {ep.number}{ep.title && ep.title !== `Episode ${ep.number}` ? ` — ${ep.title}` : ""}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {[ep.airDate, ep.runtime ? `${ep.runtime} min` : null].filter(Boolean).join(" · ") || "Details on page"}
                          </span>
                          {log && (
                            <span className="mt-1 block truncate text-xs text-amber-200/80">
                              ★ {log.rating.toFixed(1)}{log.note ? ` — “${log.note}”` : ""}
                            </span>
                          )}
                        </span>
                        {log ? (
                          <Stars value={log.rating} size={12} />
                        ) : (
                          <span className="shrink-0 text-xs text-zinc-600">Log →</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
              {epHasNext && (
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={loadMoreEpisodes} disabled={epLoading}>
                    {epLoading ? "Loading…" : "Load more episodes"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Reviews */}
        <section>
          <h2 className="serif text-2xl text-zinc-50">Reviews</h2>
          {animeReviews.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No reviews yet. Yours could be the first one worth remembering.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {animeReviews.map((r) => (
                <article key={r.id} className="rounded-2xl border border-white/10 bg-[#171412] p-5">
                  <Stars value={r.rating} size={14} />
                  <h3 className="serif mt-2 text-lg text-zinc-50">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{r.spoilers ? "⚠ Contains spoilers — hidden" : r.body}</p>
                  <p className="mt-3 text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
