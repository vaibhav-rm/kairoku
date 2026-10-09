"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { animeSlug } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

export default function ListDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lists, library } = useStore();
  const list = lists.find((l) => l.id === id);

  if (!list)
    return (
      <div className="pt-10">
        <EmptyState title="List not found." body="It may have been deleted." action={<Link href="/lists" className="text-sm text-[#e4572e]">← Back to lists</Link>} />
      </div>
    );

  const items = list.animeIds
    .map((aid) => library.find((e) => e.animeId === aid)?.anime)
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl pt-4">
      <Link href="/lists" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Lists
      </Link>
      <h1 className="serif mt-3 text-3xl text-zinc-50 sm:text-4xl">{list.name}</h1>
      <p className="mt-2 text-sm text-zinc-400">{list.description}</p>
      <div className="mt-6 space-y-3">
        {items.length === 0 && (
          <EmptyState title="Nothing here yet." body="Add anime from any anime page and they'll appear in this list." />
        )}
        {items.map((a) => (
          a && (
          <Link key={a.malId} href={`/anime/${animeSlug(a.malId, a.title)}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#171412] p-3 hover:bg-white/[0.04]">
            <SafeImage src={a.coverImage} alt="" className="h-16 w-11 rounded-lg object-cover" />
            <div>
              <p className="font-medium text-zinc-100">{a.title}</p>
              <p className="text-xs text-zinc-500">{a.year} · {a.type}</p>
            </div>
          </Link>
          )
        ))}
      </div>
      <div className="mt-6">
        <p className="text-sm text-zinc-500">Your library titles you can drag in (saved in order):</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {library.slice(0, 8).map((e) => (
            <span key={e.animeId} className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
              {e.anime?.title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
