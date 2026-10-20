"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getAnime, getAnimeEpisodes } from "@/lib/anime-api";
import { malIdFromSlug } from "@/lib/utils";
import { animeHref, episodeHref } from "@/lib/routes";
import type { Anime, Episode } from "@/types";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Stars, Textarea, Skeleton, EmptyState } from "@/components/ui";

function EpisodeView() {
  const search = useSearchParams();
  const slug = search.get("a") || "";
  const epNum = parseInt(search.get("ep") || "", 10);
  const malId = malIdFromSlug(slug);
  const router = useRouter();
  const {
    user, ready,
    getEpisodeRating, getEpisodeNote, setEpisodeRating, setEpisodeNote,
    isWatched, toggleWatched,
  } = useStore();
  const mounted = useMounted();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [ep, setEp] = useState<Episode | null>(null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const savedNoteRef = useRef("");

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!malId) return;
    getAnime(malId).then(setAnime);
    getAnimeEpisodes(malId).then((r) => {
      setEp(r.episodes.find((e) => e.number === epNum) || { number: epNum, title: `Episode ${epNum}`, runtime: 24 });
    });
  }, [malId, epNum]);

  useEffect(() => {
    if (!malId) return;
    // Restore a previously saved rating + note into the form.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRating(getEpisodeRating(malId, epNum));
    const stored = getEpisodeNote(malId, epNum);
    savedNoteRef.current = stored;
    setNote(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [malId, epNum]);

  // Debounced auto-save of the note (kept alongside the rating).
  useEffect(() => {
    if (!anime || !ep) return;
    if (note === savedNoteRef.current) return;
    const t = window.setTimeout(() => {
      savedNoteRef.current = note;
      setEpisodeNote(anime.malId, ep.number, note);
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, anime, ep]);

  if (!malId || isNaN(epNum)) return <div className="pt-10"><EmptyState title="Episode not found." body="That episode doesn't exist." /></div>;
  if (!anime || !ep) return <div className="space-y-3 pt-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /></div>;

  const back = animeHref(anime.malId, anime.title);
  const total = anime.episodes ?? null;
  const watched = isWatched(anime.malId, ep.number);
  const prev = ep.number > 1 ? ep.number - 1 : null;
  const next = total ? (ep.number < total ? ep.number + 1 : null) : ep.number + 1;
  const epHref = (n: number) => episodeHref(anime.malId, anime.title, n);

  const storedNote = getEpisodeNote(anime.malId, ep.number);
  const noteDirty = note !== storedNote;

  const rate = (value: number) => {
    setRating(value);
    setEpisodeRating(anime.malId, ep.number, value);
  };

  const commitNote = () => {
    if (note === savedNoteRef.current) return;
    savedNoteRef.current = note;
    setEpisodeNote(anime.malId, ep.number, note);
  };

  return (
    <div className="mx-auto max-w-2xl pt-4">
      <Link href={back} className="inline-flex min-h-10 items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> {anime.title}
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#e4572e]">
        {anime.titleJapanese || "Episode"} · Episode {ep.number}
        {total ? ` / ${total}` : ""}
      </p>
      <h1 className="display serif mt-3 text-3xl leading-tight text-zinc-50 sm:text-5xl">
        {ep.title && ep.title !== `Episode ${ep.number}` ? ep.title : `Episode ${ep.number}`}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        {[ep.airDate ? (mounted ? new Date(ep.airDate).toLocaleDateString() : ep.airDate) : null, ep.runtime ? `${ep.runtime} min` : null].filter(Boolean).join(" · ") || "Aired · 24 min"}
      </p>
      <button
        type="button"
        onClick={() => toggleWatched(anime, ep.number, total)}
        aria-pressed={watched}
        className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition cursor-pointer ${watched ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "border border-white/15 text-zinc-200 hover:bg-white/10"}`}
      >
        <Check size={15} /> {watched ? "Watched" : "Mark as watched"}
      </button>

      {/* Rating + optional note */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-[#171412] p-4 sm:p-5">
        <p className="text-sm font-medium text-zinc-200">How was it?</p>
        <div className="mt-2 w-fit"><Stars value={rating} onRate={rate} size={28} label={`Rate episode ${ep.number}`} /></div>
        <p className="mt-2 text-xs text-zinc-500">
          {rating > 0 ? `Saved — you rated this episode ${rating}★.` : "Tap for full stars, tap again for half. Ratings save as you go."}
        </p>

        <label htmlFor="ep-note" className="mt-6 block text-sm font-medium text-zinc-200">
          Notes <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <Textarea
          id="ep-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
          maxLength={600}
          placeholder="A thought to remember — kept with your rating."
          className="mt-2 min-h-[120px] text-[15px] leading-relaxed"
        />
        <p className="mt-2 text-xs text-zinc-500">
          {noteDirty
            ? "Saving…"
            : storedNote
              ? "Saved with your rating."
              : "Private — stored alongside the rating, on this device and in your account."}
        </p>
      </div>

      {/* Prev / next episode */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {prev ? (
          <Link href={epHref(prev)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
            <ArrowLeft size={14} /> Episode {prev}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={epHref(next)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#e4572e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#cf4a24]">
            Episode {next} <ArrowRight size={14} />
          </Link>
        ) : (
          <Link href={back} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
            Back to series
          </Link>
        )}
      </div>
    </div>
  );
}

export default function EpisodePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3 pt-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40" />
        </div>
      }
    >
      <EpisodeView />
    </Suspense>
  );
}
