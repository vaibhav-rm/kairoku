"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Bookmark, Check, Minus, PenLine, Plus } from "lucide-react";
import { getAnime, getAnimeEpisodes } from "@/lib/anime-api";
import { malIdFromSlug, animeSlug, timeUntil } from "@/lib/utils";
import type { Anime, Episode } from "@/types";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Badge, Button, EmptyState, Skeleton, Stars, ProgressBar, Textarea, Input } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

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
  const [failed, setFailed] = useState(false);
  const { library, setStatus, setProgress, setAnimeRating, logs, reviews, addReview } = useStore();
  const entry = library.find((e) => e.animeId === malId);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rTitle, setRTitle] = useState("");
  const [rBody, setRBody] = useState("");
  const [rRating, setRRating] = useState(0);
  const [rSpoiler, setRSpoiler] = useState(false);

  useEffect(() => {
    if (!malId) return;
    getAnime(malId).then((a) => {
      if (a) setAnime(a);
      else setFailed(true);
    });
    getAnimeEpisodes(malId).then((r) => setEpisodes(r.episodes)).catch(() => {});
  }, [malId]);

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
            {anime.nextEpisode && (
              <p className="mt-3 text-sm text-zinc-300">
                Episode {anime.nextEpisode.number} · <span className="text-[#e4572e] font-semibold">{mounted ? timeUntil(anime.nextEpisode.airsAt) : "···"}</span>
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
            </div>

            {/* Personal progress */}
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
          <h2 className="serif text-2xl text-zinc-50">Episodes</h2>
          {episodes.length === 0 ? (
            <div className="mt-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (
            <ol className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-[#141110]">
              {episodes.map((ep) => {
                const log = epLogs.find((l) => l.episodeNumber === ep.number);
                const watched = !!log || (entry && entry.currentEpisode >= ep.number);
                return (
                  <li key={ep.number}>
                    <Link
                      href={`/anime/${animeSlug(anime.malId, anime.title)}/episode/${ep.number}`}
                      className="flex items-center gap-4 p-3.5 transition hover:bg-white/[0.04]"
                    >
                      <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${watched ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.06] text-zinc-400"}`}>
                        {watched ? <Check size={15} /> : ep.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-100">
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
