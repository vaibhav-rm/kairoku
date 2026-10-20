"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark, Check, Minus, Plus, ListPlus, Play } from "lucide-react";
import { getAnime, getAnimeEpisodes, getAnimeGroup } from "@/lib/anime-api";
import { animeIdFromSlug, timeUntil } from "@/lib/utils";
import { animeHref, episodeHref } from "@/lib/routes";
import type { Anime, Episode, LibraryStatus } from "@/types";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Badge, Button, EmptyState, Skeleton, Stars, ProgressBar, Input } from "@/components/ui";
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

const STATUS_LABELS: Record<LibraryStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  plan_to_watch: "Want to Watch",
  paused: "Paused",
  dropped: "Dropped",
};

interface AnimeDetailViewProps {
  requestedId: number | null;
  group: Anime[];
}

function AnimeDetailView({ requestedId, group }: AnimeDetailViewProps) {
  const mounted = useMounted();
  const [selectedId, setSelectedId] = useState<number | null>(requestedId);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [epPage, setEpPage] = useState(1);
  const [epLastPage, setEpLastPage] = useState(1);
  const [epLoading, setEpLoading] = useState(false);
  const [nextAiringEp, setNextAiringEp] = useState<Episode | null>(null);
  const [failed, setFailed] = useState(false);
  const {
    library, watched, setStatus, setProgress, setAnimeRating,
    isWatched, toggleWatched, lists, saveList, addToList, removeFromList, hasInList,
  } = useStore();
  const entry = library.find((e) => e.animeId === selectedId);
  const [listOpen, setListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [ratingPromptOpen, setRatingPromptOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<Anime | null>(null);
  const [ratingDraft, setRatingDraft] = useState(0);

  // The selected season drives detail, episodes and per-title progress.
  useEffect(() => {
    if (!selectedId) return;
    let alive = true;

    getAnime(selectedId)
      .then((a) => {
        if (!alive) return;
        if (a) setAnime(a);
        else setFailed(true);
      })
      .catch(() => {});

    getAnimeEpisodes(selectedId, 1)
      .then((r) => {
        if (!alive) return;
        setEpisodes(r.episodes);
        setEpLastPage(Math.max(1, r.lastPage));
        setNextAiringEp(firstUpcoming(r.episodes));
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [selectedId]);

  const selectMember = (member: Anime) => {
    if (member.animeId === selectedId) return;
    setSelectedId(member.animeId);
    setAnime(member);
    setEpisodes([]);
    setEpPage(1);
    setEpLastPage(1);
    setNextAiringEp(null);
    setRatingPromptOpen(false);
    setRatingTarget(null);
    setListOpen(false);
    setFailed(false);
    window.history.replaceState(
      window.history.state,
      "",
      animeHref(member.animeId, member.title)
    );
  };

  const goToEpisodePage = async (page: number) => {
    if (!selectedId || epLoading) return;
    const target = Math.min(Math.max(1, page), epLastPage);
    if (target === epPage) return;
    setEpLoading(true);
    try {
      const r = await getAnimeEpisodes(selectedId, target);
      setEpisodes(r.episodes);
      setEpPage(target);
      setEpLastPage(Math.max(1, r.lastPage));
      setNextAiringEp(firstUpcoming(r.episodes));
    } finally {
      setEpLoading(false);
    }
  };

  if (!requestedId || failed)
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

  // "Up next": the first episode we haven't ticked off (or next after progress).
  // Use the full watched set (not just the loaded page) and clamp it to the
  // real episode count.
  const highestWatched = Math.min(
    Math.max(
      entry?.currentEpisode ?? 0,
      ...(watched[String(anime.animeId)] ?? []),
      0
    ),
    total ?? Number.MAX_SAFE_INTEGER
  );
  const upNext = total && highestWatched >= total ? total : highestWatched + 1;

  const pageNumbers = (() => {
    if (epLastPage <= 1) return [];
    const start = Math.max(1, Math.min(epPage - 2, epLastPage - 4));
    const end = Math.min(epLastPage, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  const openRating = (target: Anime) => {
    setRatingDraft(0);
    setRatingTarget(target);
    setRatingPromptOpen(true);
  };

  const closeRating = () => {
    setRatingPromptOpen(false);
    setRatingTarget(null);
  };

  const chooseStatus = (status: LibraryStatus) => {
    setStatus(anime, status);
    if (status === "completed" && !entry?.rating) {
      openRating(anime);
    }
  };

  /** Complete any entry from the franchise rail without leaving this page. */
  const markCompleted = (member: Anime) => {
    const memberEntry = library.find((e) => e.animeId === member.animeId);
    if (memberEntry?.status === "completed") return;
    setStatus(member, "completed");
    if (!memberEntry?.rating) openRating(member);
  };

  const handleToggleWatched = (episode: number) => {
    const wasWatched = isWatched(anime.animeId, episode);
    toggleWatched(anime, episode, total);
    if (!wasWatched && total != null && episode >= total && !entry?.rating) {
      openRating(anime);
    }
  };

  // The provider lists don't expose a "next episode"; the loader derives it
  // from real episode air dates so airing shows count down accurately.
  const nextEpisode = nextAiringEp
    ? { number: nextAiringEp.number, airsAt: nextAiringEp.airDate! }
    : anime.nextEpisode;
  const ratingAnime = ratingTarget ?? anime;

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
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 pb-10 pt-10 sm:gap-8 sm:px-6 sm:pt-16 md:grid-cols-[220px_minmax(0,1fr)] md:pt-24">
          <SafeImage
            src={anime.coverImage}
            alt={anime.title}
            className="card-lift w-28 rounded-2xl border border-white/20 shadow-2xl sm:w-40 md:w-full"
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
                  <span className="serif text-4xl tabular-nums text-amber-300 sm:text-5xl">{anime.score.toFixed(2)}</span>
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
                      onClick={() => chooseStatus(v)}
                      className={`rounded-full px-4 py-2 text-xs font-medium transition cursor-pointer max-sm:min-h-10 ${entry.status === v ? "bg-[#e4572e] text-white" : "border border-white/12 text-zinc-300 hover:bg-white/10"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
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
                      const on = hasInList(l.id, anime.animeId);
                      return (
                        <label key={l.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm text-zinc-200 hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) => (e.target.checked ? addToList(l.id, anime) : removeFromList(l.id, anime.animeId))}
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
                <Button onClick={() => handleToggleWatched(upNext)}>
                  <Check size={15} /> Mark episode {upNext} watched
                </Button>
              </div>
            )}
            {entry && (
              <div className="mt-5 max-w-md rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Your progress</p>
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={() => setProgress(anime.animeId, entry.currentEpisode - 1)} className="grid size-9 place-items-center rounded-full border border-white/15 hover:bg-white/10 cursor-pointer" aria-label="Decrease episode">
                    <Minus size={15} />
                  </button>
                  <p className="text-lg tabular-nums text-zinc-100">
                    Episode {entry.currentEpisode}{total ? ` / ${total}` : ""}
                  </p>
                  <button
                    onClick={() => {
                      const next = Math.min(entry.currentEpisode + 1, total ?? Number.MAX_SAFE_INTEGER);
                      setProgress(anime.animeId, entry.currentEpisode + 1);
                      if (total != null && next >= total && !entry.rating) {
                        openRating(anime);
                      }
                    }}
                    className="grid size-9 place-items-center rounded-full border border-white/15 hover:bg-white/10 cursor-pointer"
                    aria-label="Increase episode"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <div className="mt-3"><ProgressBar value={entry.currentEpisode} total={total} /></div>
                <div className="mt-3">
                  <p className="mb-1 text-xs text-zinc-500">Your rating</p>
                  <Stars value={entry.rating} onRate={(v) => setAnimeRating(anime.animeId, v)} label={`Rate ${anime.title}`} />
                  {entry.status === "completed" && !entry.rating && (
                    <p className="mt-1 text-xs text-[#e89a7c]">Completed — rate the series to remember how it felt.</p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={episodeHref(anime.animeId, anime.title, upNext)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#e4572e] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#cf4a24]"
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
        {/* Franchise switcher */}
        {group.length > 1 && (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">The whole story</p>
                <h2 className="serif mt-1 text-2xl text-zinc-50">Seasons, films &amp; OVAs</h2>
              </div>
              <p className="text-xs text-zinc-500">
                {group.length} entries · progress and ratings stay per title
              </p>
            </div>
            <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {group.map((member) => {
                const memberEntry = library.find((e) => e.animeId === member.animeId);
                const active = member.animeId === anime.animeId;
                const completed = memberEntry?.status === "completed";
                const first = member.animeId === group[0]?.animeId;
                return (
                  <div
                    key={member.animeId}
                    className={`flex w-64 shrink-0 snap-start items-center gap-1.5 rounded-2xl border p-2.5 transition ${
                      active
                        ? "border-[#e4572e]/60 bg-[#e4572e]/10"
                        : "border-white/10 bg-[#141110]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectMember(member)}
                      aria-pressed={active}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left cursor-pointer hover:opacity-90"
                    >
                      <SafeImage
                        src={member.coverImage}
                        alt=""
                        className="h-16 w-11 shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-zinc-100">
                          {member.title}
                        </span>
                        <span className="mt-0.5 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                          {[first ? "Start here" : null, member.year, member.type].filter(Boolean).join(" · ")}
                        </span>
                        {memberEntry && (
                          <span
                            className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                              completed
                                ? "bg-emerald-500/15 text-emerald-300"
                                : memberEntry.status === "watching"
                                  ? "bg-[#e4572e]/15 text-[#e89a7c]"
                                  : "bg-white/10 text-zinc-400"
                            }`}
                          >
                            {STATUS_LABELS[memberEntry.status]}
                          </span>
                        )}
                      </span>
                    </button>
                    {completed ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!memberEntry?.rating) openRating(member);
                        }}
                        disabled={!!memberEntry?.rating}
                        className={`grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 ${
                          memberEntry?.rating ? "" : "cursor-pointer ring-1 ring-emerald-400/30 hover:bg-emerald-500/25"
                        }`}
                        title={memberEntry?.rating ? "Completed" : `Rate ${member.title}`}
                        aria-label={memberEntry?.rating ? "Completed" : `Rate ${member.title}`}
                      >
                        <Check size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markCompleted(member)}
                        className="grid size-8 shrink-0 place-items-center rounded-full border border-white/15 text-zinc-400 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer"
                        title={`Mark ${member.title} completed`}
                        aria-label={`Mark ${member.title} completed`}
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Episodes */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="serif text-2xl text-zinc-50">Episodes</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {highestWatched}{total ? ` / ${total}` : ""} watched
                {epLastPage > 1 ? ` · Page ${epPage} of ${epLastPage}` : ""}
              </span>
              {total && (
                <Link
                  href={episodeHref(anime.animeId, anime.title, upNext)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-zinc-100 hover:bg-white/5"
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
                  const isEpWatched = isWatched(anime.animeId, ep.number);
                  return (
                    <li key={ep.number} className="flex items-center gap-2 pr-3 transition hover:bg-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => handleToggleWatched(ep.number)}
                        aria-pressed={isEpWatched}
                        aria-label={`Mark episode ${ep.number} ${isEpWatched ? "unwatched" : "watched"}`}
                        className={`ml-3 grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold transition cursor-pointer ${isEpWatched ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "bg-white/[0.06] text-zinc-400 hover:bg-white/15"}`}
                      >
                        {isEpWatched ? <Check size={15} /> : ep.number}
                      </button>
                      <Link
                        href={episodeHref(anime.animeId, anime.title, ep.number)}
                        className="flex min-w-0 flex-1 items-center gap-3 py-3.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-medium ${isEpWatched ? "text-zinc-400" : "text-zinc-100"}`}>
                            Episode {ep.number}{ep.title && ep.title !== `Episode ${ep.number}` ? ` — ${ep.title}` : ""}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {[ep.airDate, ep.runtime ? `${ep.runtime} min` : null].filter(Boolean).join(" · ") || "Details on page"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
              {pageNumbers.length > 0 && (
                <nav className="mt-4 flex flex-wrap items-center justify-center gap-1.5" aria-label="Episode pages">
                  <Button
                    variant="outline"
                    onClick={() => goToEpisodePage(epPage - 1)}
                    disabled={epPage <= 1 || epLoading}
                  >
                    Prev
                  </Button>
                  {pageNumbers[0] > 1 && <span className="px-1 text-xs text-zinc-600">…</span>}
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToEpisodePage(p)}
                      disabled={epLoading}
                      aria-current={p === epPage ? "page" : undefined}
                      className={`grid size-9 place-items-center rounded-full text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${p === epPage ? "bg-[#e4572e] text-white" : "border border-white/12 text-zinc-300 hover:bg-white/10"}`}
                    >
                      {p}
                    </button>
                  ))}
                  {pageNumbers[pageNumbers.length - 1] < epLastPage && <span className="px-1 text-xs text-zinc-600">…</span>}
                  <Button
                    variant="outline"
                    onClick={() => goToEpisodePage(epPage + 1)}
                    disabled={epPage >= epLastPage || epLoading}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      {/* Completion rating prompt */}
      {ratingPromptOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="rating-prompt-title">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#171412] p-6 text-center shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#e4572e]">Completed</p>
            <h3 id="rating-prompt-title" className="serif mt-2 text-2xl leading-tight text-zinc-50">
              How was {ratingAnime.title}?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              One rating, for the whole story. It tunes your recommendations.
            </p>
            <div className="mt-5 flex justify-center">
              <Stars value={ratingDraft} onRate={setRatingDraft} size={32} label={`Rate ${ratingAnime.title}`} />
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <Button
                disabled={ratingDraft <= 0}
                onClick={() => {
                  setAnimeRating(ratingAnime.animeId, ratingDraft);
                  closeRating();
                }}
              >
                Save rating
              </Button>
              <Button variant="ghost" onClick={closeRating}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnimeDetail() {
  const slug = useSearchParams().get("a") || "";
  const requestedId = animeIdFromSlug(slug);
  const [loaded, setLoaded] = useState<{ id: number | null; items: Anime[] }>({
    id: null,
    items: [],
  });

  // Load the whole franchise in the background; the selected title still
  // renders immediately so slow relationship lookups never block the page.
  useEffect(() => {
    if (!requestedId) return;
    let alive = true;
    getAnimeGroup(requestedId)
      .then((items) => {
        if (alive) setLoaded({ id: requestedId, items });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [requestedId]);

  const group = loaded.id === requestedId ? loaded.items : [];
  return (
    <AnimeDetailView
      key={requestedId ?? "missing"}
      requestedId={requestedId}
      group={group}
    />
  );
}

export default function AnimeDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 pt-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      }
    >
      <AnimeDetail />
    </Suspense>
  );
}
