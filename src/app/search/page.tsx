"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { searchAnime } from "@/lib/anime-api";
import { animeHref } from "@/lib/routes";
import type { Anime } from "@/types";
import { Badge, Skeleton } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";
import { QuickAdd } from "@/components/anime-cards";

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") || "";
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(() => initial.trim().length > 0);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    boxRef.current?.focus();
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (!query) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await searchAnime(query);
      if (cancelled) return; // a newer query already took over
      setResults(r);
      setActive(0);
      setLoading(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const go = (a: Anime) => router.push(animeHref(a.malId, a.title));

  return (
    <div className="pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e4572e]">検索 · Search</p>
      <h1 className="serif mt-1 text-3xl text-zinc-50">What are you looking for?</h1>
      <div className="relative mt-6">
        <SearchIcon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          ref={boxRef}
          value={q}
          onChange={(e) => {
            const value = e.target.value;
            setQ(value);
            setResults([]);
            setLoading(value.trim().length > 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              go(results[active]);
            } else if (e.key === "Escape") {
              setQ("");
              setResults([]);
              setLoading(false);
            }
          }}
          placeholder="Title, Japanese title, genre…"
          aria-label="Search anime"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="anime-search-results"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-4 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[#e4572e]/60"
        />
      </div>
      <p className="mt-2 hidden text-xs text-zinc-500 sm:block">↑↓ navigate · Enter open · Esc clear</p>

      {loading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {!loading && q && results.length === 0 && (
        <p className="mt-8 text-center text-sm text-zinc-500">
          No results for “{q}”. Try a Japanese title or fewer words.
        </p>
      )}

      <ul id="anime-search-results" className="mt-6 space-y-2" role="listbox" aria-label="Search results">
        {results.map((a, i) => (
          <li key={a.malId}>
            <div
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-3 transition ${i === active ? "border-[#e4572e]/50 bg-white/[0.06]" : "border-white/[0.07] bg-[#171412]"}`}
              onClick={() => go(a)}
            >
              <SafeImage src={a.coverImage} alt="" className="h-20 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-100">{a.title}</p>
                <p className="truncate text-xs text-zinc-500">
                  {[a.year, a.type, a.status].filter(Boolean).join(" · ")}
                  {a.score ? ` · ★ ${a.score.toFixed(2)}` : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {a.genres.slice(0, 3).map((g) => (
                    <Badge key={g}>{g}</Badge>
                  ))}
                </div>
              </div>
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className="hidden sm:block"><QuickAdd anime={a} /></span>
                <span className="sm:hidden"><QuickAdd anime={a} compact /></span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!q && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Popular right now</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Frieren", "One Piece", "Dandadan", "Vinland Saga", "Mushishi", "Jujutsu"].map((t) => (
              <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:border-[#e4572e]/50 hover:text-white max-sm:min-h-11 max-sm:inline-flex max-sm:items-center">
                {t}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
