"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Button, EmptyState } from "@/components/ui";

export default function NotificationsPage() {
  const { user, ready, notifications, markAllRead } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (!mounted || !ready || !user) return null;

  return (
    <div className="mx-auto max-w-2xl pt-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e4572e]">通知 · Notifications</p>
          <h1 className="serif mt-1 text-3xl text-zinc-50">Never miss a story.</h1>
        </div>
        <Button variant="ghost" onClick={markAllRead}>Mark all read</Button>
      </div>
      {notifications.length === 0 ? (
        <div className="mt-6"><EmptyState title="All quiet." body="New episodes, likes, and follows will appear here." /></div>
      ) : (
        <div className="mt-6 space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 rounded-2xl border p-4 ${n.read ? "border-white/[0.07] bg-[#141110]" : "border-[#e4572e]/25 bg-[#1a1412]"}`}>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e4572e]/15 text-[#e4572e]">
                <BellRing size={16} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-100">{n.title}</p>
                <p className="text-xs text-zinc-500">{n.body} · {new Date(n.createdAt).toLocaleString()}</p>
                {n.animeId && (
                  <Link href={`/anime/${n.animeId}-x`} className="mt-2 inline-block rounded-full bg-[#e4572e] px-4 py-1.5 text-xs font-semibold text-white">
                    Log episode
                  </Link>
                )}
              </div>
              {!n.read && <span className="size-2 rounded-full bg-[#e4572e]" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
