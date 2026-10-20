"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getAnime, getAnimeEpisode } from "@/lib/anime-api";
import { animeIdFromSlug } from "@/lib/utils";
import { animeHref, episodeHref } from "@/lib/routes";
import type { Anime, Episode } from "@/types";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Skeleton, EmptyState } from "@/components/ui";

function EpisodeView() {
  const search = useSearchParams();
  const slug = search.get("a") || "";
  const epNum = parseInt(search.get("ep") || "", 10);
  const animeId = animeIdFromSlug(slug);
  const router = useRouter();
  const { user, ready, isWatched, toggleWatched } = useStore();
  const mounted = useMounted();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [ep, setEp] = useState<Episode | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!animeId || isNaN(epNum)) return;
    getAnime(animeId).then(setAnime);
    getAnimeEpisode(animeId, epNum).then((found) => {
      setEp(found || { number: epNum, title: `Episode ${epNum}`, runtime: 24 });
    });
  }, [animeId, epNum]);

  if (!animeId || isNaN(epNum)) return <div className="pt-10"><EmptyState title="Episode not found." body="That episode doesn't exist." /></div>;
  if (!anime || !ep) return <div className="space-y-3 pt-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /></div>;

  const back = animeHref(anime.animeId, anime.title);
  const total = anime.episodes ?? null;
  const watched = isWatched(anime.animeId, ep.number);
  const prev = ep.number > 1 ? ep.number - 1 : null;
  const next = total ? (ep.number < total ? ep.number + 1 : null) : ep.number + 1;
  const epHref = (n: number) => episodeHref(anime.animeId, anime.title, n);

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

      {ep.synopsis && (
        <p className="mt-6 text-sm leading-relaxed text-zinc-300">{ep.synopsis}</p>
      )}

      {/* Prev / next episode */}
      <div className="mt-8 flex items-center justify-between gap-3">
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
