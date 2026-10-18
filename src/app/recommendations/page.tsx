"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { animeHref } from "@/lib/routes";
import { buildRecommendations, type RecommendationBundle } from "@/lib/recommend";
import { RecommendationCard, RecommendationSkeleton } from "@/components/recommend";
import { EmptyState, Skeleton } from "@/components/ui";

export default function RecommendationsPage() {
  const { user, ready, library, reviews } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  const [bundle, setBundle] = useState<RecommendationBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    buildRecommendations(
      {
        library,
        reviews,
        favoriteGenres: user.favoriteGenres,
      },
      18
    )
      .then((b) => {
        if (alive) setBundle(b);
      })
      .catch(() => {
        if (alive) setBundle({ forYou: [], because: [], personalized: false });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // Rebuild when the user's taste inputs change materially.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, library.length, reviews.length]);

  if (!mounted || !ready || !user) {
    return (
      <div className="space-y-6 pt-4">
        <Skeleton className="h-10 w-2/3" />
        <RecommendationSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-12 pt-4">
      <header>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">
          <Sparkles size={13} /> おすすめ · Curated for your taste
        </p>
        <h1 className="display serif mt-2 max-w-2xl text-4xl leading-[1.02] text-zinc-50 sm:text-6xl">
          Recommended for you.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Built from what you watch, rate, and write down. The more you log,
          the sharper these get.
        </p>
      </header>

      {loading ? (
        <RecommendationSkeleton />
      ) : !bundle || bundle.forYou.length === 0 ? (
        <EmptyState
          title="Not enough signal yet."
          body="Add a few anime, rate them, and log an episode or two — recommendations sharpen fast."
          action={
            <Link
              href="/discover"
              className="rounded-full bg-[#e4572e] px-5 py-2.5 text-sm font-medium text-white"
            >
              Discover anime
            </Link>
          }
        />
      ) : (
        <>
          {!bundle.personalized && (
            <p className="rounded-2xl border border-amber-400/25 bg-amber-400/5 px-5 py-3 text-sm text-amber-200">
              These are popularity-based for now. Rate a few titles you love to
              unlock personalised picks.
            </p>
          )}

          <section>
            <div className="flex items-end justify-between">
              <h2 className="display serif text-3xl text-zinc-50 sm:text-4xl">
                Handpicked for you
              </h2>
              <Link
                href="/discover"
                className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
              >
                Browse everything <ArrowRight size={14} />
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {bundle.forYou.map((rec, i) => (
                <div key={rec.anime.malId} className="w-full">
                  <RecommendationCard rec={rec} index={i} />
                </div>
              ))}
            </div>
          </section>

          {bundle.because.map((rail) => (
            <section key={rail.anime.malId}>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">
                あなたへ · Similar stories
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <h2 className="display serif text-2xl text-zinc-50 sm:text-3xl">
                  {rail.reason}
                </h2>
                <Link
                  href={animeHref(rail.anime.malId, rail.anime.title)}
                  className="hidden shrink-0 text-sm text-zinc-400 hover:text-white sm:inline"
                >
                  View title
                </Link>
              </div>
              <div className="no-scrollbar snap-row -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {rail.items.map((a, i) => (
                  <div key={a.malId} className="w-[150px] shrink-0 snap-start sm:w-[170px]">
                    <RecommendationCard
                      rec={{ anime: a, score: 0, reasons: [`Like ${rail.anime.title}`] }}
                      index={i}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
