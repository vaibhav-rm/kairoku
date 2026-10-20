"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Play } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { useNow } from "@/hooks/use-now";
import { countdown } from "@/lib/utils";
import { animeHref, episodeHref } from "@/lib/routes";
import { airingWatchingCount, buildSchedule, type Schedule } from "@/lib/airing";
import { EmptyState, Skeleton } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";
import type { AiringItem } from "@/types";

/** Friendly day heading for a timestamp, relative to the ticking clock. */
function dayHeading(airsAt: number, now: number): string {
  const d = new Date(airsAt);
  const today = new Date(now);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (same(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface DayGroup {
  key: string;
  label: string;
  items: AiringItem[];
}

export default function UpcomingPage() {
  const { user, ready, library } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  const now = useNow(1000);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    buildSchedule(library)
      .then((s) => {
        if (alive) setSchedule(s);
      })
      .catch(() => {
        if (alive) setSchedule({ upcoming: [], recent: [] });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, library.length]);

  if (!mounted || !ready || !user) {
    return (
      <div className="space-y-4 pt-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const airingCount = airingWatchingCount(library);
  const upcoming = schedule?.upcoming ?? [];
  const recent = (schedule?.recent ?? []).filter((r) => {
    const entry = library.find((e) => e.animeId === r.anime.animeId);
    return !entry || r.episode.number > entry.currentEpisode;
  });

  const groups: DayGroup[] = [];
  for (const item of upcoming) {
    const key = new Date(item.airsAt).toDateString();
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: dayHeading(item.airsAt, now), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-4">
      <header>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[#e4572e]">
          <CalendarClock size={13} /> 次回 · Upcoming
        </p>
        <h1 className="display serif mt-2 text-4xl leading-[1.02] text-zinc-50 sm:text-5xl">
          What&apos;s airing next.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Episodes from the airing titles you&apos;re watching, in release order —
          with a live countdown to each drop
          {airingCount > 0 ? ` (${airingCount} airing ${airingCount === 1 ? "series" : "serieses"})` : ""}.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : airingCount === 0 ? (
        <EmptyState
          title="Nothing airing on your list."
          body="Mark an airing anime as Watching and its next episodes will count down here."
          action={
            <Link href="/discover" className="rounded-full bg-[#e4572e] px-5 py-2.5 text-sm font-medium text-white">
              Find airing anime
            </Link>
          }
        />
      ) : upcoming.length === 0 ? (
        <EmptyState
          title="No upcoming episodes found."
          body="We couldn't find any future episodes for your airing titles. It may be between seasons."
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="serif text-xl text-zinc-100">{group.label}</h2>
              <ul className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-[#141110]">
                {group.items.map((item) => {
                  const href = animeHref(item.anime.animeId, item.anime.title);
                  return (
                    <li key={`${item.anime.animeId}-${item.episode.number}`} className="flex items-center gap-3 p-3 pr-4 transition hover:bg-white/[0.04]">
                      <Link href={href} className="relative shrink-0">
                        <SafeImage
                          src={item.anime.coverImage}
                          alt={item.anime.title}
                          className="h-16 w-12 rounded-lg border border-white/10 object-cover"
                          loading="lazy"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={href} className="block truncate text-sm font-medium text-zinc-100 hover:text-white">
                          {item.anime.title}
                        </Link>
                        <p className="truncate text-xs text-zinc-500">
                          Episode {item.episode.number}
                          {item.episode.title && item.episode.title !== `Episode ${item.episode.number}` ? ` — ${item.episode.title}` : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          {new Date(item.airsAt).toLocaleString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="serif text-lg tabular-nums text-[#e89a7c]">
                          {countdown(item.airsAt, now)}
                        </p>
                        <Link
                          href={episodeHref(item.anime.animeId, item.anime.title, item.episode.number)}
                          className="mt-1 inline-flex items-center gap-1 rounded-full py-1.5 pl-1 pr-2 text-[11px] text-zinc-500 hover:text-white"
                        >
                          <Play size={10} fill="currentColor" /> Episode page
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="serif text-xl text-zinc-100">Recently aired</h2>
          <p className="mt-1 text-xs text-zinc-500">Missed the drop? These are waiting for you.</p>
          <ul className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-[#141110]">
            {recent.map((item) => {
              const href = episodeHref(item.anime.animeId, item.anime.title, item.episode.number);
              return (
                <li key={`${item.anime.animeId}-${item.episode.number}`}>
                  <Link href={href} className="flex items-center gap-3 p-3 pr-4 transition hover:bg-white/[0.04]">
                    <span className="ml-1 rounded-full bg-[#e4572e]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#e4572e]">New</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                      {item.anime.title} — Episode {item.episode.number}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {new Date(item.airsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
