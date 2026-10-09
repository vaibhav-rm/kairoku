"use client";

import { useEffect, useState } from "react";
import { getBrowseLists } from "@/lib/anime-api";
import type { ProviderStatus } from "@/lib/anime-api";
import type { Anime } from "@/types";
import { AnimeCard } from "@/components/anime-cards";
import { RankCard } from "@/components/cinema";
import { Skeleton } from "@/components/ui";

function Rail({ title, sub, items }: { title: string; sub: string; items: Anime[] }) {
  return (
    <section>
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">{sub}</p>
      <h2 className="display serif mt-2 text-3xl text-zinc-50 sm:text-4xl">{title}</h2>
      <div className="no-scrollbar snap-row -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {items.map((a, i) => (
          <div key={a.malId} className="w-[150px] shrink-0 snap-start sm:w-[170px]">
            <AnimeCard anime={a} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DiscoverPage() {
  const [data, setData] = useState<{ trending: Anime[]; airing: Anime[]; top: Anime[]; live: ProviderStatus } | null>(null);

  useEffect(() => {
    getBrowseLists().then(setData).catch(() => setData({ trending: [], airing: [], top: [], live: "mock" }));
  }, []);

  if (!data) {
    return (
      <div className="space-y-8 pt-4">
        <Skeleton className="h-[380px] w-full !rounded-3xl" />
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-[150px] shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pt-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">発見 · Now playing everywhere</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="display serif max-w-2xl flex-1 text-4xl leading-[1.02] text-zinc-50 sm:text-6xl">
            Find something worth remembering.
          </h1>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${
              data.live === "mock"
                ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            }`}
            title={data.live === "mock" ? "Live providers unreachable — showing the built-in catalog" : `Live data via ${data.live}`}
          >
            {data.live === "mock" ? "Offline catalog" : `Live · ${data.live}`}
          </span>
        </div>
      </header>

      {/* TOP 10 — ranked rail */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">名作 · All-time</p>
        <h2 className="display serif mt-2 text-3xl text-zinc-50 sm:text-4xl">Top 10 highest rated</h2>
        <div className="no-scrollbar snap-row -mx-4 mt-5 flex gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {data.top.slice(0, 10).map((a, i) => (
            <RankCard key={a.malId} anime={a} rank={i + 1} />
          ))}
        </div>
      </section>

      <Rail title="Trending this season" sub="今期 · This season" items={data.trending} />
      <Rail title="Currently airing" sub="放送中 · On air" items={data.airing} />
    </div>
  );
}
