"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import type { LibraryStatus } from "@/types";
import { animeHref } from "@/lib/routes";
import { Button, EmptyState, StarsDisplay, ProgressBar } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

const TABS: { v: LibraryStatus | "all"; label: string }[] = [
  { v: "all", label: "All" },
  { v: "watching", label: "Watching" },
  { v: "completed", label: "Completed" },
  { v: "plan_to_watch", label: "Plan to Watch" },
  { v: "paused", label: "Paused" },
  { v: "dropped", label: "Dropped" },
];

export default function LibraryPage() {
  const { user, ready, library, removeFromLibrary } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["v"]>("all");
  const [sort, setSort] = useState("updated");

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  const items = useMemo(() => {
    const list = tab === "all" ? [...library] : library.filter((e) => e.status === tab);
    if (sort === "alpha") list.sort((a, b) => (a.anime?.title || "").localeCompare(b.anime?.title || ""));
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else list.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return list;
  }, [library, tab, sort]);

  if (!mounted || !ready || !user) return null;

  return (
    <div className="pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e4572e]">本棚 · Library</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="display serif text-3xl text-zinc-50 sm:text-4xl">Your shelf.</h1>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-zinc-200 max-sm:min-h-11" aria-label="Sort library">
          <option value="updated" className="bg-zinc-900">Recently updated</option>
          <option value="alpha" className="bg-zinc-900">Alphabetical</option>
          <option value="rating" className="bg-zinc-900">Your rating</option>
        </select>
      </div>
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium cursor-pointer max-sm:min-h-10 ${tab === t.v ? "bg-[#e4572e] text-white" : "border border-white/10 text-zinc-400 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Got a backlog?"
            body="Your shelf is empty here. Find something to watch and it will live here."
            action={<Link href="/discover" className="rounded-full bg-[#e4572e] px-5 py-2.5 text-sm font-medium text-white">Find something to watch</Link>}
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <div key={e.animeId} className="flex gap-3 rounded-2xl border border-white/10 bg-[#171412] p-3">
              <SafeImage src={e.anime?.coverImage} alt="" className="h-28 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <Link href={animeHref(e.animeId, e.anime?.title)} className="line-clamp-1 font-medium text-zinc-100 hover:underline">
                  {e.anime?.title}
                </Link>
                <p className="text-xs capitalize text-zinc-500">{e.status.replace(/_/g, " ")} · Ep {e.currentEpisode}{e.totalEpisodes ? `/${e.totalEpisodes}` : ""}</p>
                <div className="mt-2"><ProgressBar value={e.currentEpisode} total={e.totalEpisodes} /></div>
                <div className="mt-2 flex items-center justify-between">
                  <StarsDisplay value={e.rating} size={12} />
                  <button onClick={() => removeFromLibrary(e.animeId)} className="-mr-1 -my-1 rounded-full px-2 py-2 text-[11px] text-zinc-600 hover:text-red-400 cursor-pointer">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 text-center">
        <Link href="/watchlist"><Button variant="outline">Open Watchlist →</Button></Link>
      </div>
    </div>
  );
}
