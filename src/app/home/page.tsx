"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { animeSlug, greeting, timeUntil } from "@/lib/utils";
import { ContinueCard } from "@/components/anime-cards";
import { RankCard, ShowtimeRow, Spotlight } from "@/components/cinema";
import { EmptyState, Skeleton, StarsDisplay } from "@/components/ui";
import { getBrowseLists } from "@/lib/anime-api";
import type { Anime } from "@/types";
import type { ProviderStatus } from "@/lib/anime-api";

export default function HomePage() {
  const { user, ready, library, logs, reviews } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  const [recs, setRecs] = useState<Anime[]>([]);
  const [live, setLive] = useState<ProviderStatus>("mock");

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  useEffect(() => {
    getBrowseLists().then((b) => {
      setRecs(b.trending.slice(0, 8));
      setLive(b.live);
    }).catch(() => {});
  }, []);

  if (!mounted || !ready || !user) {
    return (
      <div className="space-y-4 pt-6">
        <Skeleton className="h-[420px] w-full !rounded-3xl" />
        <div className="flex gap-3"><Skeleton className="h-56 w-[300px]" /><Skeleton className="h-56 w-[300px]" /></div>
      </div>
    );
  }

  const watching = library.filter((e) => e.status === "watching");
  const feature = watching[0];
  const fallback = !feature ? recs[0] : undefined;
  const upcoming = library
    .filter((e) => e.anime?.nextEpisode || e.anime?.airing)
    .slice(0, 4);
  const totalEps = library.reduce((s, e) => s + e.currentEpisode, 0) + logs.length;

  return (
    <div className="space-y-12 pt-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">おかえり · Now showing for you</p>
          <h1 className="display serif mt-2 text-3xl text-zinc-50 sm:text-5xl">
            {greeting()}, {user.displayName}.
          </h1>
        </div>
        <Link href="/diary" className="hidden shrink-0 items-center gap-1 text-sm text-zinc-400 hover:text-white sm:inline-flex">
          Tonight&apos;s diary <ArrowUpRight size={15} />
        </Link>
      </header>

      {/* SPOTLIGHT */}
      {feature?.anime ? (
        <Spotlight
          anime={feature.anime}
          kicker={`Now showing · Episode ${feature.currentEpisode}`}
          meta={[feature.anime.year, feature.anime.type, feature.anime.status].filter(Boolean).join(" · ")}
          progressValue={feature.currentEpisode}
          progressTotal={feature.totalEpisodes ?? feature.anime.episodes}
          progressLabel={`Episode ${feature.currentEpisode}${feature.totalEpisodes ? ` of ${feature.totalEpisodes}` : ""}`}
          countdown={feature.anime.nextEpisode ? `Next: Ep ${feature.anime.nextEpisode.number} · ${timeUntil(feature.anime.nextEpisode.airsAt)}` : undefined}
          primaryHref={`/anime/${animeSlug(feature.anime.malId, feature.anime.title)}/episode/${feature.currentEpisode + 1}`}
          primaryLabel={`Continue — Episode ${feature.currentEpisode + 1}`}
          secondaryHref={`/anime/${animeSlug(feature.anime.malId, feature.anime.title)}`}
          secondaryLabel="Story details"
        />
      ) : fallback ? (
        <Spotlight
          anime={fallback}
          kicker="Premiere · Recommended for you"
          meta={[fallback.year, fallback.type, fallback.status].filter(Boolean).join(" · ")}
          primaryHref={`/anime/${animeSlug(fallback.malId, fallback.title)}`}
          primaryLabel="View story"
          secondaryHref="/discover"
          secondaryLabel="More premieres"
        />
      ) : (
        <EmptyState
          title="Nothing playing right now."
          body="Find something worth remembering."
          action={<Link href="/discover" className="rounded-full bg-[#e4572e] px-5 py-2.5 text-sm font-medium text-white">Discover anime</Link>}
        />
      )}

      {/* SHOWTIMES + CONTINUE RAIL */}
      <section className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="serif text-2xl text-zinc-50">Coming up</h2>
            <Link href="/watchlist" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
              Watchlist <ArrowRight size={14} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming episodes."
              body="Follow an airing anime and we'll count down to the next episode."
              action={<Link href="/discover" className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-zinc-100">Find airing anime</Link>}
            />
          ) : (
            <div>
              {upcoming.map((e, i) => (
                <ShowtimeRow
                  key={e.animeId}
                  index={`0${i + 1}`}
                  title={e.anime?.title || ""}
                  line={`Episode ${e.anime?.nextEpisode?.number ?? e.currentEpisode + 1}`}
                  countdown={e.anime?.nextEpisode ? timeUntil(e.anime.nextEpisode.airsAt) : "Soon"}
                  href={`/anime/${animeSlug(e.animeId, e.anime?.title || "")}`}
                />
              ))}
            </div>
          )}

          <div className="mb-2 mt-10 flex items-center justify-between">
            <h2 className="serif text-2xl text-zinc-50">Continue watching</h2>
            <Link href="/library" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
              Library <ArrowRight size={14} />
            </Link>
          </div>
          {watching.length <= 1 ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-5 py-6 text-sm text-zinc-500">
              {watching.length === 0
                ? "Your reel is empty — add something to your Kairoku."
                : "One story on the reel. Add another from Discover."}
            </p>
          ) : (
            <div className="no-scrollbar snap-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {watching.map((e) => (
                <ContinueCard key={e.animeId} entry={e} />
              ))}
            </div>
          )}
        </div>

        {/* PROGRAM — stats + diary */}
        <aside className="space-y-4">
          <div className="sunset-glow rounded-2xl border border-white/10 bg-[#141110] p-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Tonight&apos;s program</h3>
            <dl className="mt-4 space-y-3">
              {[["On the reel", watching.length], ["Episodes logged", totalEps], ["Reviews written", reviews.length], ["Diary entries", logs.length]].map(([k, v]) => (
                <div key={k as string} className="flex items-baseline justify-between border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                  <dt className="text-sm text-zinc-500">{k}</dt>
                  <dd className="serif text-3xl tabular-nums text-zinc-50">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href={`/u/${user.username}`} className="mt-5 block rounded-full border border-white/15 py-2.5 text-center text-sm text-zinc-100 transition hover:bg-white/5">
              Full statistics
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#141110] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Latest entry</h3>
              <Link href="/diary" className="text-xs text-[#e89a7c] hover:text-white">Diary →</Link>
            </div>
            {logs[0] ? (
              <div className="mt-3">
                <p className="text-sm font-semibold text-zinc-100">{logs[0].animeTitle} — Ep {logs[0].episodeNumber}</p>
                <div className="mt-1"><StarsDisplay value={logs[0].rating} /></div>
                {logs[0].note && <p className="serif mt-2 text-lg italic leading-snug text-zinc-200">“{logs[0].note}”</p>}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Your story starts with a single episode.</p>
            )}
          </div>
        </aside>
      </section>

      {/* RANKED RAIL */}
      {recs.length > 0 && (
        <section>
          <div className="flex items-end justify-between">
            <h2 className="serif text-2xl text-zinc-50">Top 10 for you</h2>
            <div className="flex items-center gap-3">
              {live === "mock" && (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-300">
                  Offline catalog
                </span>
              )}
              <Link href="/discover" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
                Discover <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="no-scrollbar snap-row -mx-4 mt-5 flex gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {recs.map((a, i) => (
              <RankCard key={a.malId} anime={a} rank={i + 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
