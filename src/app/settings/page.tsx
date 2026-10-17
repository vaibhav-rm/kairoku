"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { Button, Input, Textarea } from "@/components/ui";

export default function SettingsPage() {
  const { user, ready, updateProfile, signOut, library, episodeRatings, watched, reviews, lists } = useStore();
  const mounted = useMounted();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (!mounted || !ready || !user) return null;

  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({ user, library, episodeRatings, watched, reviews, lists, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kairoku-export-${user.username}.json`;
    a.click();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 pt-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e4572e]">設定 · Settings</p>
        <h1 className="serif mt-1 text-3xl text-zinc-50">Make it yours.</h1>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#171412] p-5">
        <h2 className="font-semibold text-zinc-100">Account</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="s-dn" className="text-xs text-zinc-400">Display name</label>
            <Input id="s-dn" value={user.displayName} onChange={(e) => updateProfile({ displayName: e.target.value })} />
          </div>
          <div>
            <label htmlFor="s-bio" className="text-xs text-zinc-400">Bio</label>
            <Textarea id="s-bio" value={user.bio || ""} onChange={(e) => updateProfile({ bio: e.target.value })} placeholder="A line about you…" className="min-h-[80px]" />
          </div>
          <div>
            <label htmlFor="s-tz" className="text-xs text-zinc-400">Timezone</label>
            <Input id="s-tz" value={user.timezone} onChange={(e) => updateProfile({ timezone: e.target.value })} />
            <p className="mt-1 text-[11px] text-zinc-500">Release times are shown in this timezone. Default: your browser timezone.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#171412] p-5">
        <h2 className="font-semibold text-zinc-100">Privacy</h2>
        <p className="mt-1 text-sm text-zinc-400">Your library, episode progress, and ratings are private by default. Reviews you publish are visible to others — ratings and watch progress never are.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#171412] p-5">
        <h2 className="font-semibold text-zinc-100">Data</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData}>Export my data (JSON)</Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
          >
            Log out
          </Button>
        </div>
      </section>
    </div>
  );
}
