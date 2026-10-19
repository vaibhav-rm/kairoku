"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { greeting, timeUntil } from "@/lib/utils";
import { animeHref, episodeHref, profileHref } from "@/lib/routes";
import { ContinueCard } from "@/components/anime-cards";
import { RankCard, ShowtimeRow, Spotlight } from "@/components/cinema";
import { EmptyState, Skeleton } from "@/components/ui";
import type { Anime } from "@/types";
import { buildRecommendations, type RecommendationBundle } from "@/lib/recommend";
import { RecommendationCard } from "@/components/recommend";

export default function HomePage() {
  const { user, ready, library, reviews, lists } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  const [recs, setRecs] = useState<Anime[]>([]);
  const [bundle, setBundle] = useState<RecommendationBundle | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    buildRecommendations(
      { library, reviews, favoriteGenres: user.favoriteGenres },
      10
    )
      .then((b) => {
        if (!alive) return;
        setBundle(b);
        setRecs(b.forYou.map((r) => r.anime).slice(0, 8));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, library.length, reviews.length]);

  if (!mounted || !ready || !user) {
    return (
      <div className="space-y-4 pt-6">
        <Skeleton className="h-[380px] w-full !rounded-3xl sm:h-[420px]" />
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-56 w-[80%] max-w-[300px] shrink-0" />
          <Skeleton className="h-56 w-[80%] max-w-[300px] shrink-0" />
        </div>
      </div>
    );
  }

  const watching = library.filter((e) => e.status === "watching");
  const feature = watching[0];
  const fallback = !feature ? recs[0] : undefined;
  const upcoming = library
    .filter((e) => e.anime?.nextEpisode || e.anime?.airing)
    .slice(0, 4);
  const totalEps = library.reduce((s, e) => s + e.currentEpisode, 0);
  const nextUp = library
    .filter((e) => e.anime?.nextEpisode?.airsAt)
    .sort(
      (a, b) =>
        new Date(a.anime!.nextEpisode!.airsAt).getTime() -
        new Date(b.anime!.nextEpisode!.airsAt).getTime()
    )[0];

  return (
    <div className="space-y-12 pt-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">おかえり · Now showing for you</p>
          <h1 className="display serif mt-2 text-3xl text-zinc-50 sm:text-5xl">
            {greeting()}, {user.displayName}.
          </h1>
        </div>
        <Link href="/upcoming" className="hidden shrink-0 items-center gap-1 text-sm text-zinc-400 hover:text-white sm:inline-flex">
          Upcoming <ArrowUpRight size={15} />
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
          primaryHref={episodeHref(feature.anime.malId, feature.anime.title, feature.currentEpisode + 1)}
          primaryLabel={`Continue — Episode ${feature.currentEpisode + 1}`}
          secondaryHref={animeHref(feature.anime.malId, feature.anime.title)}
          secondaryLabel="Story details"
        />
      ) : fallback ? (
        <Spotlight
          anime={fallback}
          kicker="Premiere · Recommended for you"
          meta={[fallback.year, fallback.type, fallback.status].filter(Boolean).join(" · ")}
          primaryHref={animeHref(fallback.malId, fallback.title)}
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
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
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
                  href={animeHref(e.animeId, e.anime?.title)}
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

        {/* PROGRAM — stats + next up */}
        <aside className="space-y-4">
          <div className="sunset-glow rounded-2xl border border-white/10 bg-[#141110] p-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Tonight&apos;s program</h3>
            <dl className="mt-4 space-y-3">
              {[["On the reel", watching.length], ["Episodes watched", totalEps], ["Reviews written", reviews.length], ["Lists made", lists.length]].map(([k, v]) => (
                <div key={k as string} className="flex items-baseline justify-between border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                  <dt className="text-sm text-zinc-500">{k}</dt>
                  <dd className="serif text-3xl tabular-nums text-zinc-50">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href={profileHref(user.username)} className="mt-5 block rounded-full border border-white/15 py-2.5 text-center text-sm text-zinc-100 transition hover:bg-white/5">
              Full statistics
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#141110] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Up next</h3>
              <Link href="/upcoming" className="text-xs text-[#e89a7c] hover:text-white">Upcoming →</Link>
            </div>
            {nextUp?.anime?.nextEpisode ? (
              <div className="mt-3">
                <p className="text-sm font-semibold text-zinc-100">{nextUp.anime.title}</p>
                <p className="text-xs text-zinc-500">Episode {nextUp.anime.nextEpisode.number}</p>
                <p className="serif mt-2 text-3xl tabular-nums text-zinc-50">
                  {timeUntil(nextUp.anime.nextEpisode.airsAt)}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  {new Date(nextUp.anime.nextEpisode.airsAt).toLocaleString(undefined, {
                    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Nothing airing soon from your list.</p>
            )}
          </div>
        </aside>
      </section>

      {/* RANKED RECOMMENDATIONS */}
      {recs.length > 0 && (
        <section>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">あなたへ · Picked for your taste</p>
              <h2 className="serif mt-1 text-2xl text-zinc-50">Recommended for you</h2>
            </div>
            <Link href="/recommendations" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
              See all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="no-scrollbar snap-row -mx-4 mt-5 flex gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {recs.map((a, i) => (
              <RankCard key={a.malId} anime={a} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* BECAUSE YOU LIKED */}
      {bundle?.because.map((rail) => (
        <section key={rail.anime.malId}>
          <h2 className="serif text-2xl text-zinc-50">{rail.reason}</h2>
          <div className="no-scrollbar snap-row -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {rail.items.map((a, i) => (
              <div key={a.malId} className="w-[150px] shrink-0 snap-start sm:w-[170px]">
                <RecommendationCard rec={{ anime: a, score: 0, reasons: [`Like ${rail.anime.title}`] }} index={i} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
