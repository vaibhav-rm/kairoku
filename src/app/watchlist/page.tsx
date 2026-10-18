"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { timeUntil } from "@/lib/utils";
import { animeHref } from "@/lib/routes";
import { Button, EmptyState } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

export default function WatchlistPage() {
  const { user, ready, library, setStatus, removeFromLibrary } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (!mounted || !ready || !user) return null;

  const items = library.filter((e) => e.status === "plan_to_watch");

  return (
    <div className="pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e4572e]">後で見る · Watchlist</p>
      <h1 className="serif mt-1 text-3xl text-zinc-50 sm:text-4xl">Want to watch.</h1>
      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Got a backlog?"
            body="Save anime here for later. We'll keep track of releases for you."
            action={<Link href="/discover" className="rounded-full bg-[#e4572e] px-5 py-2.5 text-sm font-medium text-white">Find something to watch</Link>}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <div key={e.animeId} className="rounded-2xl border border-white/10 bg-[#171412] p-4">
              <div className="flex gap-3">
                <SafeImage src={e.anime?.coverImage} alt="" className="h-24 w-16 rounded-xl object-cover" loading="lazy" />
                <div className="min-w-0">
                  <Link href={animeHref(e.animeId, e.anime?.title)} className="font-medium text-zinc-100 hover:underline">
                    {e.anime?.title}
                  </Link>
                  <p className="text-xs text-zinc-500">{e.anime?.status || ""}{e.anime?.year ? ` · ${e.anime.year}` : ""}</p>
                  {e.anime?.nextEpisode && (
                    <p className="mt-1 text-xs text-[#e4572e]">Ep {e.anime.nextEpisode.number} in {timeUntil(e.anime.nextEpisode.airsAt)}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button className="!px-4 !py-1.5 !text-xs" onClick={() => e.anime && setStatus(e.anime, "watching")}>Start watching</Button>
                <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => removeFromLibrary(e.animeId)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
