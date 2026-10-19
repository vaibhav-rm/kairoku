"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Play, Plus, Check } from "lucide-react";
import type { Anime, LibraryEntry } from "@/types";
import { timeUntil } from "@/lib/utils";
import { animeHref, episodeHref } from "@/lib/routes";
import { ProgressBar } from "./ui";
import { SafeImage } from "./safe-image";
import { useStore } from "@/lib/store";

export function AnimeCard({ anime, index = 0 }: { anime: Anime; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link href={animeHref(anime.malId, anime.title)} className="group block" aria-label={anime.title}>
        <div className="card-lift relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <SafeImage
            src={anime.coverImage}
            alt={anime.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-90" />
          {anime.score != null && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 py-0.5 pl-2 pr-2.5 text-[11px] font-semibold text-amber-300 backdrop-blur">
              <span className="text-amber-400">★</span> {anime.score.toFixed(2)}
            </span>
          )}
          {anime.airing && (
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[#e4572e] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <span className="size-1 animate-pulse rounded-full bg-white" /> Airing
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e89a7c]">
              View story →
            </p>
          </div>
        </div>
        <p className="mt-2 line-clamp-1 text-sm font-medium text-zinc-200 transition-colors group-hover:text-white">
          {anime.title}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
          {[anime.year, anime.type].filter(Boolean).join(" · ")}
        </p>
      </Link>
    </motion.div>
  );
}

export function ContinueCard({ entry }: { entry: LibraryEntry }) {
  const anime = entry.anime!;
  const { setProgress } = useStore();
  const next = entry.currentEpisode + 1;
  const total = entry.totalEpisodes ?? anime.episodes ?? null;
  return (
    <div className="card-lift group relative w-[280px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#171412] snap-start sm:w-[300px]">
      <div className="relative h-36 overflow-hidden">
        <SafeImage src={anime.bannerImage || anime.coverImage} alt="" className="h-full w-full object-cover object-top opacity-80 transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171412] via-[#171412]/40 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <p className="line-clamp-1 font-semibold text-white">{anime.title}</p>
          <p className="text-xs text-zinc-400">
            Episode {entry.currentEpisode}{total ? ` / ${total}` : ""} · {total ? Math.round((entry.currentEpisode / total) * 100) : 0}%
          </p>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <ProgressBar value={entry.currentEpisode} total={total} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProgress(anime.malId, entry.currentEpisode - 1)}
            className="grid size-9 place-items-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/10 cursor-pointer"
            aria-label="Decrease episode"
          >
            −
          </button>
          <span className="text-sm tabular-nums text-zinc-200 w-8 text-center">{entry.currentEpisode}</span>
          <button
            onClick={() => setProgress(anime.malId, entry.currentEpisode + 1)}
            className="grid size-9 place-items-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/10 cursor-pointer"
            aria-label="Increase episode"
          >
            +
          </button>
          <Link
            href={episodeHref(anime.malId, anime.title, next)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#e4572e] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#cf4a24]"
          >
            <Play size={12} fill="currentColor" /> Continue
          </Link>
        </div>
        {anime.nextEpisode && (
          <p className="text-[11px] text-zinc-500">
            Next: Episode {anime.nextEpisode.number} · {timeUntil(anime.nextEpisode.airsAt)}
          </p>
        )}
      </div>
    </div>
  );
}

export function QuickAdd({ anime, compact = false }: { anime: Anime; compact?: boolean }) {
  const { library, setStatus } = useStore();
  const inLib = library.some((e) => e.animeId === anime.malId);
  if (inLib)
    return compact ? (
      <span aria-label={`${anime.title} is in your Kairoku`} className="grid size-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
        <Check size={15} />
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
        <Check size={12} /> In your Kairoku
      </span>
    );
  return compact ? (
    <button
      onClick={() => setStatus(anime, "watching")}
      aria-label={`Add ${anime.title} to Kairoku`}
      className="grid size-9 place-items-center rounded-full bg-white/10 text-zinc-100 hover:bg-[#e4572e] hover:text-white transition cursor-pointer"
    >
      <Plus size={15} />
    </button>
  ) : (
    <button
      onClick={() => setStatus(anime, "watching")}
      className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-zinc-100 hover:bg-[#e4572e] hover:text-white transition cursor-pointer"
    >
      <Plus size={12} /> Add to Kairoku
    </button>
  );
}
