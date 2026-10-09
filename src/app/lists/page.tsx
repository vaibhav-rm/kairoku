"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Button, EmptyState, Input, Textarea } from "@/components/ui";

export default function ListsPage() {
  const { user, ready, lists, saveList, deleteList, library } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [pub, setPub] = useState(true);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (!mounted || !ready || !user) return null;

  return (
    <div className="mx-auto max-w-3xl pt-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e4572e]">リスト · Lists</p>
          <h1 className="serif mt-1 text-3xl text-zinc-50 sm:text-4xl">Collections of meaning.</h1>
        </div>
        <Button onClick={() => setOpen((v) => !v)}><Plus size={15} /> New list</Button>
      </div>

      {open && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#171412] p-5">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="List name — e.g. Comfort anime" aria-label="List name" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this list about?" className="mt-3 min-h-[80px]" aria-label="List description" />
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => setPub(true)} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs cursor-pointer ${pub ? "bg-[#e4572e] text-white" : "border border-white/10 text-zinc-400"}`}>
              <Globe size={12} /> Public
            </button>
            <button onClick={() => setPub(false)} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs cursor-pointer ${!pub ? "bg-white/15 text-white" : "border border-white/10 text-zinc-400"}`}>
              <Lock size={12} /> Private
            </button>
            <Button
              className="ml-auto"
              onClick={() => {
                if (!name.trim()) return;
                saveList({ name, description: desc, isPublic: pub, animeIds: library.slice(0, 3).map((e) => e.animeId) });
                setName(""); setDesc(""); setOpen(false);
              }}
            >
              Save list
            </Button>
          </div>
        </div>
      )}

      {lists.length === 0 && !open ? (
        <div className="mt-6">
          <EmptyState
            title="No lists yet."
            body="Comfort anime. Best villains. 2026 favorites. Make your first collection."
            action={<Button onClick={() => setOpen(true)}>Create your first list</Button>}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {lists.map((l) => (
            <div key={l.id} className="rounded-2xl border border-white/10 bg-[#171412] p-5">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/lists/${l.id}`} className="serif text-xl text-zinc-50 hover:underline">{l.name}</Link>
                <button onClick={() => deleteList(l.id)} aria-label={`Delete ${l.name}`} className="text-zinc-600 hover:text-red-400 cursor-pointer">
                  <Trash2 size={15} />
                </button>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{l.description || "No description."}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-zinc-500">
                {l.isPublic ? <><Globe size={11} /> Public</> : <><Lock size={11} /> Private</>} · {l.animeIds.length} titles
              </p>
            </div>
          ))}
          {/* Starter suggestions */}
          <div className="rounded-2xl border border-dashed border-white/10 p-5">
            <p className="text-sm font-medium text-zinc-300">Ideas to start</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Comfort anime", "Best villains", "2026 favorites", "Watch with friends"].map((s) => (
                <button key={s} onClick={() => { setName(s); setOpen(true); }} className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
