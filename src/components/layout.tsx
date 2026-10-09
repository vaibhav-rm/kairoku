"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, Compass, Home, Library, Search, ListVideo } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/diary", label: "Diary", icon: BookOpen },
  { href: "/library", label: "Library", icon: Library },
  { href: "/lists", label: "Lists", icon: ListVideo },
];

export function TopNav() {
  const path = usePathname();
  const { user, ready, notifications } = useStore();
  const mounted = useMounted();
  // `mounted` (useSyncExternalStore) is false on the server AND during
  // hydration by React's guarantee — unlike useState, it cannot leak
  // client session state into the first client render. Session-dependent
  // links must never differ between SSR HTML and the hydration pass.
  const u = mounted && ready ? user : null;
  const [q, setQ] = useState("");
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0f0e0c]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href={u ? "/home" : "/"} className="flex shrink-0 items-center gap-2.5" aria-label="Kairoku home">
          <span className="hanko grid size-8 place-items-center rounded-[9px] text-[13px] font-bold leading-none">
            回
          </span>
          <span className="text-[19px] font-bold tracking-tight text-zinc-50">
            Kairoku
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {(u ? [
            { href: "/home", label: "Home", icon: Home },
            ...LINKS.slice(1),
          ] : LINKS.slice(0, 3)).map((l) => {
            const active = path === l.href || (l.href !== "/" && path.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm transition",
                  active ? "text-white" : "text-zinc-500 hover:text-zinc-100"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.08]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <form
            className="relative hidden sm:block"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search anime…  ( / )"
              aria-label="Search anime"
              className="w-44 rounded-full border border-white/10 bg-white/[0.06] py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:w-64 focus:border-[#e4572e]/50 transition-all"
            />
          </form>
          <Link
            href="/search"
            aria-label="Search"
            className="grid size-9 place-items-center rounded-full text-zinc-300 hover:bg-white/10 sm:hidden"
          >
            <Search size={18} />
          </Link>
          {u && (
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative grid size-9 place-items-center rounded-full text-zinc-300 hover:bg-white/10"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[#e4572e] text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          )}
          {u ? (
            <Link
              href={`/u/${u.username}`}
              className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#e4572e] to-amber-500 text-sm font-bold text-white"
              aria-label="Profile"
            >
              {u.displayName.slice(0, 1).toUpperCase()}
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-zinc-300 hover:text-white sm:block">
                Log in
              </Link>
              <Link href="/signup" className="rounded-full bg-[#e4572e] px-4 py-2 text-sm font-medium text-white hover:bg-[#cf4a24]">
                Start your Kairoku
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  const { user, ready } = useStore();
  const mounted = useMounted();
  const u = mounted && ready ? user : null;
  const items = [
    { href: u ? "/home" : "/", label: "Home", icon: Home },
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/diary", label: "Diary", icon: BookOpen },
    { href: "/library", label: "Library", icon: Library },
    { href: u ? `/u/${u.username}` : "/login", label: "Profile", icon: Search },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0f0e0c]/95 backdrop-blur-xl md:hidden" aria-label="Mobile">
      <div className="grid grid-cols-5">
        {items.map((l) => {
          const active = path === l.href;
          return (
            <Link key={l.label} href={l.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px]", active ? "text-[#e4572e]" : "text-zinc-500")}>
              <l.icon size={20} />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Toast() {
  const { toast } = useStore();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 md:bottom-8"
        >
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1c1815]/95 px-5 py-2.5 text-sm text-zinc-100 shadow-2xl backdrop-blur">
            <span className="size-1.5 rounded-full bg-[#e4572e]" />
            {toast}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

