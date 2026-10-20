"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { animeHref, listHref } from "@/lib/routes";
import { EmptyState, Skeleton } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

const TABS = ["Anime", "Overview", "Episodes", "Lists"] as const;

function Profile() {
  const username = useSearchParams().get("u") || "";
  const { user, library, lists } = useStore();
  const mounted = useMounted();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Anime");
  if (!mounted) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-20 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  const isOwn = user?.username === username.toLowerCase();

  const totalEps = library.reduce((s, e) => s + e.currentEpisode, 0);
  const hours = Math.round((totalEps * 24) / 60);
  const genreCount = new Map<string, number>();
  library.forEach((e) => e.anime?.genres.forEach((g) => genreCount.set(g, (genreCount.get(g) || 0) + 1)));
  const topGenre = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const rated = library.filter((e) => e.rating > 0);
  const avg = rated.length
    ? rated.reduce((s, e) => s + e.rating, 0) / rated.length
    : 0;
  const allRatings = rated.map((e) => e.rating);

  // Public profile fallback for demo usernames
  const display = isOwn && user ? user : {
    username: username.toLowerCase(),
    displayName: username,
    bio: "Collecting stories, one episode at a time.",
    createdAt: "2026-01-15T00:00:00Z",
  };
  const joinedAt = "createdAt" in display ? display.createdAt : new Date().toISOString();
  const bioText = "bio" in display ? display.bio : "";

  return (
    <div className="pt-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-[#e4572e] to-amber-500 text-3xl font-bold text-white">
          {display.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex-1">
          <h1 className="serif text-3xl text-zinc-50">@{display.username}</h1>
          <p className="text-sm text-zinc-400">{display.displayName} · Joined {mounted ? new Date(joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "···"}</p>
          <p className="mt-1 max-w-lg text-sm text-zinc-300">{bioText || "No bio yet."}</p>
        </div>
        {isOwn && (
          <Link href="/settings" className="inline-flex items-center self-start rounded-full border border-white/15 px-5 py-2 text-sm text-zinc-100 hover:bg-white/5 max-sm:min-h-11">
            Edit profile
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {[
          [library.length, "Anime"],
          [totalEps, "Episodes"],
          [hours, "Hours"],
          [rated.length, "Rated"],
          [topGenre, "Top genre"],
        ].map(([v, l]) => (
          <div key={l as string} className="rounded-2xl border border-white/10 bg-[#171412] p-4 text-center">
            <p className="serif truncate text-2xl text-zinc-50">{v}</p>
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">{l}</p>
          </div>
        ))}
      </div>

      {/* Genre + rating charts (personal, not corporate) */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#171412] p-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Genres you live in</h3>
          <div className="mt-4 space-y-2.5">
            {[...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g, c]) => (
              <div key={g}>
                <div className="flex justify-between text-xs"><span className="text-zinc-300">{g}</span><span className="text-zinc-500">{c}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#e4572e] to-amber-400" style={{ width: `${Math.min(100, (c / Math.max(1, library.length)) * 100 * 2)}%` }} />
                </div>
              </div>
            ))}
            {genreCount.size === 0 && <p className="text-sm text-zinc-500">Watch something and your taste will paint itself here.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#171412] p-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">How you rate</h3>
          <p className="serif mt-2 text-4xl text-zinc-50">{avg ? avg.toFixed(1) : "—"} <span className="text-base text-zinc-500">average</span></p>
          <div className="mt-3 flex items-end gap-1.5">
            {[5, 4.5, 4, 3.5, 3].map((r) => {
              const n = allRatings.filter((v) => Math.abs(v - r) < 0.26).length;
              return (
                <div key={r} className="flex-1 text-center">
                  <div className="mx-auto w-full rounded-t bg-[#e4572e]/70" style={{ height: `${Math.max(4, n * 14)}px` }} />
                  <p className="mt-1 text-[10px] text-zinc-500">{r}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium cursor-pointer max-sm:min-h-10 ${tab === t ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Overview" && (
          <div className="space-y-3">
            {[...library]
              .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
              .slice(0, 5)
              .map((e) => (
                <Link
                  key={e.animeId}
                  href={animeHref(e.animeId, e.anime?.title)}
                  className="block rounded-2xl border border-white/[0.07] bg-[#141110] p-4 hover:bg-white/[0.04]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-zinc-100">{e.anime?.title || `Anime ${e.animeId}`}</span>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      {e.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Ep {e.currentEpisode}{e.totalEpisodes ? ` / ${e.totalEpisodes}` : ""}
                    {e.rating > 0 ? ` · ${e.rating} ★` : ""}
                  </p>
                </Link>
              ))}
            {library.length === 0 && <EmptyState title="Quiet here — for now." body="Activity will appear as you track and rate." />}
          </div>
        )}
        {tab === "Episodes" && (
          <div className="space-y-3">
            {library.filter((e) => e.currentEpisode > 0).map((e) => (
              <div key={e.animeId} className="rounded-2xl border border-white/10 bg-[#171412] p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link href={animeHref(e.animeId, e.anime?.title)} className="font-medium text-zinc-100 hover:text-white">{e.anime?.title}</Link>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-500">Ep {e.currentEpisode}{e.totalEpisodes ? ` / ${e.totalEpisodes}` : ""}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#e4572e] to-amber-400" style={{ width: `${e.totalEpisodes ? Math.min(100, (e.currentEpisode / e.totalEpisodes) * 100) : 8}%` }} />
                </div>
              </div>
            ))}
            {library.filter((e) => e.currentEpisode > 0).length === 0 && <EmptyState title="No episodes watched yet." body="Tick off an episode and it will show up here." />}
          </div>
        )}
        {tab === "Anime" && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {library.map((e) => (
              <Link key={e.animeId} href={animeHref(e.animeId, e.anime?.title)} className="group">
                <SafeImage src={e.anime?.coverImage} alt={e.anime?.title} className="aspect-[2/3] w-full rounded-xl border border-white/10 object-cover" loading="lazy" />
                <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-zinc-200 group-hover:text-white">
                  {e.anime?.title || `Anime ${e.animeId}`}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {e.status.replace("_", " ")}
                  {e.rating > 0 ? ` · ${e.rating} ★` : ""}
                </p>
              </Link>
            ))}
            {library.length === 0 && <div className="col-span-full"><EmptyState title="No anime yet." body="Add something to your Kairoku." /></div>}
          </div>
        )}
        {tab === "Lists" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {lists.map((l) => (
              <Link key={l.id} href={listHref(l.id)} className="rounded-2xl border border-white/10 bg-[#171412] p-5 hover:bg-white/[0.04]">
                <p className="serif text-lg text-zinc-50">{l.name}</p>
                <p className="text-xs text-zinc-500">{l.animeIds.length} titles</p>
              </Link>
            ))}
            {lists.length === 0 && <div className="col-span-full"><EmptyState title="No lists." body="Collections of meaning, coming soon." /></div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 pt-4">
          <Skeleton className="h-20 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      }
    >
      <Profile />
    </Suspense>
  );
}
