"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, Globe, Lock, Plus, Search, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { animeSlug } from "@/lib/utils";
import type { Anime } from "@/types";
import { Button, EmptyState, Input } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

export default function ListDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lists, library, saveList, addToList, removeFromList } = useStore();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");

  const list = lists.find((l) => l.id === id);

  if (!list)
    return (
      <div className="pt-10">
        <EmptyState title="List not found." body="It may have been deleted." action={<Link href="/lists" className="text-sm text-[#e4572e]">← Back to lists</Link>} />
      </div>
    );

  // Prefer the stored snapshot; fall back to the library for legacy lists
  // that only persisted `animeIds`.
  const items: Anime[] = list.items?.length
    ? list.items
    : list.animeIds
        .map((aid) => library.find((e) => e.animeId === aid)?.anime)
        .filter((a): a is Anime => !!a);

  const inList = new Set(items.map((a) => a.malId));
  const candidates = library
    .map((e) => e.anime)
    .filter((a): a is Anime => !!a && !inList.has(a.malId))
    .filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-3xl pt-4">
      <Link href="/lists" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Lists
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="serif text-3xl text-zinc-50 sm:text-4xl">{list.name}</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">{list.description || "No description."}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
            {list.isPublic ? <><Globe size={11} /> Public</> : <><Lock size={11} /> Private</>} · {items.length} titles
          </span>
          <div className="flex gap-2">
            <Button variant="soft" className="!px-4 !py-1.5 !text-xs" onClick={() => setAdding((v) => !v)}>
              <Plus size={13} /> Add titles
            </Button>
            {!list.isPublic && (
              <Button
                variant="ghost"
                className="!px-3 !py-1.5 !text-xs"
                onClick={() =>
                  saveList({
                    id: list.id,
                    name: list.name,
                    description: list.description,
                    isPublic: true,
                    animeIds: list.animeIds,
                    items,
                  })
                }
              >
                Make public
              </Button>
            )}
          </div>
        </div>
      </div>

      {adding && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#171412] p-4">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your library…" className="!pl-9" aria-label="Search library" />
          </div>
          {candidates.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              {library.length === 0
                ? "Your library is empty — add anime first, then collect them here."
                : "Nothing left to add from your library."}
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {candidates.slice(0, 12).map((a) => (
                <button
                  key={a.malId}
                  onClick={() => addToList(list.id, a)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-2 text-left hover:border-[#e4572e]/50 cursor-pointer"
                >
                  <SafeImage src={a.coverImage} alt="" className="h-14 w-10 shrink-0 rounded-md object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">{a.title}</span>
                    <span className="text-xs text-zinc-500">{[a.year, a.type].filter(Boolean).join(" · ")}</span>
                  </span>
                  <Plus size={15} className="shrink-0 text-[#e4572e]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {items.length === 0 && (
          <EmptyState
            title="Nothing here yet."
            body="Use “Add titles” to pull anime straight from your library, or open any anime and add it to this list."
            action={<Button onClick={() => setAdding(true)}>Add titles</Button>}
          />
        )}
        {items.map((a) => (
          <div key={a.malId} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#171412] p-3">
            <Link href={`/anime/${animeSlug(a.malId, a.title)}`} className="flex min-w-0 flex-1 items-center gap-4">
              <SafeImage src={a.coverImage} alt="" className="h-16 w-11 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-zinc-100">{a.title}</span>
                <span className="text-xs text-zinc-500">{[a.year, a.type, a.score ? `★ ${a.score.toFixed(2)}` : null].filter(Boolean).join(" · ")}</span>
              </span>
            </Link>
            <button
              onClick={() => removeFromList(list.id, a.malId)}
              aria-label={`Remove ${a.title} from ${list.name}`}
              className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-white/10 hover:text-red-400 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-10 border-t border-white/10 pt-4">
        <Link href="/lists" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
          <Trash2 size={12} /> Back to all lists
        </Link>
      </div>
    </div>
  );
}
