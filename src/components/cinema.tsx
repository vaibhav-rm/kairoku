"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Play } from "lucide-react";
import type { Anime } from "@/types";
import { animeHref } from "@/lib/routes";
import { ProgressBar } from "./ui";
import { SafeImage } from "./safe-image";

/* Full-bleed cinematic feature — the "now showing" screen. */
export function Spotlight({
  anime,
  kicker,
  meta,
  progressValue,
  progressTotal,
  progressLabel,
  countdown,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  anime: Anime;
  kicker: string;
  meta?: string;
  progressValue?: number;
  progressTotal?: number | null;
  progressLabel?: string;
  countdown?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="grain relative overflow-hidden rounded-3xl border border-white/10"
      aria-label={kicker}
    >
      <div className="absolute inset-0">
        <SafeImage
          src={anime.bannerImage || anime.coverImage}
          alt=""
          className="kenburns h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />
      </div>
      {/* letterbox */}
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/80 to-transparent" aria-hidden />
      <div className="relative flex min-h-[380px] flex-col justify-end p-5 sm:min-h-[480px] sm:p-10">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.32em] text-[#e89a7c]">
          <span className="size-1.5 animate-pulse rounded-full bg-[#e4572e]" />
          {kicker}
        </p>
        <h2 className="display serif mt-3 max-w-3xl text-[2.6rem] leading-[0.98] text-white sm:text-7xl">
          {anime.title}
        </h2>
        {meta && (
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">{meta}</p>
        )}
        {progressValue != null && (
          <div className="mt-5 max-w-md">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-zinc-100">{progressLabel}</span>
              {countdown && <span className="tabular-nums text-[#e89a7c]">{countdown}</span>}
            </div>
            <div className="mt-2">
              <ProgressBar value={progressValue} total={progressTotal} />
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#e4572e] px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(228,87,46,0.7)] transition hover:bg-[#cf4a24] active:scale-[0.98] max-sm:w-full"
          >
            <Play size={15} fill="currentColor" /> {primaryLabel}
          </Link>
          {secondaryHref && (
            <Link
              href={secondaryHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/25 bg-black/40 px-7 py-3 text-sm font-medium text-zinc-100 backdrop-blur transition hover:border-white/50 max-sm:w-full"
            >
              {secondaryLabel} <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </motion.section>
  );
}

/* Theater listing row — showtime style. */
export function ShowtimeRow({
  index,
  title,
  line,
  meta,
  countdown,
  href,
}: {
  index: string;
  title: string;
  line: string;
  meta?: string;
  countdown: string;
  href: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
    >
      <Link
        href={href}
        className="group flex items-center gap-4 border-b border-white/[0.08] py-4 transition-colors first:border-t hover:bg-white/[0.03] sm:gap-6 sm:px-3"
      >
        <span className="serif w-8 shrink-0 text-lg italic text-zinc-600 transition-colors group-hover:text-[#e4572e]">
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-zinc-100">{title}</span>
          <span className="block truncate text-xs tracking-wide text-zinc-500">
            {line}{meta ? ` · ${meta}` : ""}
          </span>
        </span>
        <span className="serif shrink-0 text-xl tabular-nums text-[#e89a7c] sm:text-2xl">{countdown}</span>
        <ArrowRight size={16} className="shrink-0 text-zinc-600 transition-all group-hover:translate-x-1 group-hover:text-white" />
      </Link>
    </motion.div>
  );
}

/* Ranked poster — Top-10 style with giant outlined number. */
export function RankCard({ anime, rank }: { anime: Anime; rank: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="w-[170px] shrink-0 snap-start sm:w-[220px]"
    >
      <Link href={animeHref(anime.malId, anime.title)} className="group flex items-end" aria-label={`#${rank}: ${anime.title}`}>
        <span aria-hidden className="outline-num serif -mr-4 mb-1 shrink-0 text-[84px] font-semibold leading-[0.8] sm:text-[110px]">
          {rank}
        </span>
        <span className="card-lift relative block aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <SafeImage
            src={anime.coverImage}
            alt={anime.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition group-hover:opacity-100" />
        </span>
      </Link>
      <p className="mt-2 line-clamp-1 pl-10 text-sm font-medium text-zinc-200">{anime.title}</p>
      <p className="pl-10 text-xs tabular-nums text-zinc-500">
        {anime.score ? `★ ${anime.score.toFixed(2)}` : ""}{anime.year ? ` · ${anime.year}` : ""}
      </p>
    </motion.div>
  );
}
