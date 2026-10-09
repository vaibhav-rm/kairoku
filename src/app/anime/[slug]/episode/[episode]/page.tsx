"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import { getAnime, getAnimeEpisodes } from "@/lib/anime-api";
import { animeSlug, malIdFromSlug } from "@/lib/utils";
import type { Anime, Episode } from "@/types";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Button, Stars, Textarea, Skeleton, EmptyState } from "@/components/ui";

export default function EpisodePage({ params }: { params: Promise<{ slug: string; episode: string }> }) {
  const { slug, episode } = use(params);
  const epNum = parseInt(episode, 10);
  const malId = malIdFromSlug(slug);
  const router = useRouter();
  const { user, ready, logs, addLog } = useStore();
  const mounted = useMounted();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [ep, setEp] = useState<Episode | null>(null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [spoilers, setSpoilers] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!malId) return;
    getAnime(malId).then(setAnime);
    getAnimeEpisodes(malId).then((r) => {
      setEp(r.episodes.find((e) => e.number === epNum) || { number: epNum, title: `Episode ${epNum}`, runtime: 24 });
    });
  }, [malId, epNum]);

  useEffect(() => {
    if (!malId) return;
    const ex = logs.find((l) => l.animeId === malId && l.episodeNumber === epNum);
    if (ex) {
      // Restore a previously saved entry into the form.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRating(ex.rating); setNote(ex.note); setIsPublic(ex.isPublic); setSpoilers(ex.spoilers);
    }
  }, [logs, malId, epNum]);

  if (!malId || isNaN(epNum)) return <div className="pt-10"><EmptyState title="Episode not found." body="That episode doesn't exist." /></div>;
  if (!anime || !ep) return <div className="space-y-3 pt-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-40" /></div>;

  const back = `/anime/${animeSlug(anime.malId, anime.title)}`;

  return (
    <div className="mx-auto max-w-2xl pt-4">
      <Link href={back} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> {anime.title}
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#e4572e]">
        {anime.titleJapanese || "Episode"} · Episode {ep.number}
      </p>
      <h1 className="display serif mt-3 text-3xl leading-tight text-zinc-50 sm:text-5xl">
        {ep.title && ep.title !== `Episode ${ep.number}` ? ep.title : `Episode ${ep.number}`}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        {[ep.airDate ? (mounted ? new Date(ep.airDate).toLocaleDateString() : ep.airDate) : null, ep.runtime ? `${ep.runtime} min` : null].filter(Boolean).join(" · ") || "Aired · 24 min"}
      </p>

      {/* Rating */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-[#171412] p-5">
        <p className="text-sm font-medium text-zinc-200">How was it?</p>
        <div className="mt-2 scale-110 origin-left"><Stars value={rating} onRate={setRating} size={26} label={`Rate episode ${ep.number}`} /></div>
        <p className="mt-2 text-xs text-zinc-500">Tap for full stars, tap again for half. Right-click also gives half.</p>
      </div>

      {/* Diary */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#171412] p-5">
        <label htmlFor="note" className="text-sm font-medium text-zinc-200">What did you think?</label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write something you'll want to remember…"
          className="mt-2 min-h-[140px] text-[15px] leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-white/10 p-1 text-xs" role="group" aria-label="Visibility">
            <button onClick={() => setIsPublic(false)} className={`rounded-full px-4 py-1.5 ${!isPublic ? "bg-white/10 text-white" : "text-zinc-400"} cursor-pointer`}>Private diary entry</button>
            <button onClick={() => setIsPublic(true)} className={`rounded-full px-4 py-1.5 ${isPublic ? "bg-[#e4572e] text-white" : "text-zinc-400"} cursor-pointer`}>Publish as review</button>
          </div>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} className="size-4 accent-[#e4572e]" />
            Contains spoilers
          </label>
        </div>
        <Button
          className="mt-4 w-full py-3"
          onClick={() => {
            addLog({
              animeId: anime.malId, animeTitle: anime.title, coverImage: anime.coverImage,
              episodeNumber: ep.number, episodeTitle: ep.title, rating: rating || 5,
              note, isPublic, spoilers, date: new Date().toISOString().slice(0, 10),
            });
            setSaved(true);
            setTimeout(() => router.push("/diary"), 900);
          }}
        >
          <Check size={15} /> {saved ? "Logged — see you in the diary." : "Log episode"}
        </Button>
        {saved && <p className="mt-2 flex items-center gap-1.5 text-center text-xs text-emerald-300">{isPublic ? <Eye size={12} /> : <EyeOff size={12} />} {isPublic ? "Published to your diary." : "Saved privately. Only you can see it."}</p>}
      </div>
    </div>
  );
}
