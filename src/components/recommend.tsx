"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import type { Recommendation } from "@/types";
import { animeSlug } from "@/lib/utils";
import { SafeImage } from "./safe-image";
import { Skeleton } from "./ui";

/** Poster card that surfaces *why* it was recommended. */
export function RecommendationCard({
  rec,
  index = 0,
}: {
  rec: Recommendation;
  index?: number;
}) {
  const a = rec.anime;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      className="w-[150px] shrink-0 snap-start sm:w-[170px]"
    >
      <Link href={`/anime/${animeSlug(a.malId, a.title)}`} className="group block" aria-label={a.title}>
        <div className="card-lift relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <SafeImage
            src={a.coverImage}
            alt={a.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-95" />
          {a.score != null && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 py-0.5 pl-2 pr-2.5 text-[11px] font-semibold text-amber-300 backdrop-blur">
              <span className="text-amber-400">★</span> {a.score.toFixed(2)}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-2.5">
            <p className="flex items-start gap-1 text-[10px] font-semibold leading-tight text-[#e89a7c]">
              <Sparkles size={11} className="mt-px shrink-0" />
              <span className="line-clamp-2">{rec.reasons[0] || "Recommended for you"}</span>
            </p>
          </div>
        </div>
        <p className="mt-2 line-clamp-1 text-sm font-medium text-zinc-200 transition-colors group-hover:text-white">
          {a.title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
          {rec.reasons.filter((r) => !r.startsWith("More ")).slice(0, 1)[0] ||
            [a.year, a.type].filter(Boolean).join(" · ")}
        </p>
      </Link>
    </motion.div>
  );
}

/** Horizontal "For you" rail. */
export function RecommendationRail({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Recommendation[];
}) {
  if (!items.length) return null;
  return (
    <section>
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">{subtitle}</p>
      <h2 className="display serif mt-2 text-3xl text-zinc-50 sm:text-4xl">{title}</h2>
      <div className="no-scrollbar snap-row -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {items.map((rec, i) => (
          <RecommendationCard key={rec.anime.malId} rec={rec} index={i} />
        ))}
      </div>
    </section>
  );
}

export function RecommendationSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-40" />
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-[150px] shrink-0 sm:w-[170px]" />
        ))}
      </div>
    </div>
  );
}
