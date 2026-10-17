"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { MOCK_ANIME } from "@/lib/mock-data";
import { timeUntil } from "@/lib/utils";
import { RankCard, ShowtimeRow } from "@/components/cinema";
import { Button, StarsDisplay } from "@/components/ui";
import { SafeImage } from "@/components/safe-image";

const fade = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

function Band({
  no,
  jp,
  children,
  backdrop,
}: {
  no: string;
  jp: string;
  children: React.ReactNode;
  backdrop?: string;
}) {
  return (
    <section className="grain relative overflow-hidden border-t border-white/[0.07]">
      {backdrop && (
        <div className="absolute inset-0" aria-hidden>
          <SafeImage src={backdrop} alt="" className="h-full w-full object-cover object-top opacity-[0.14]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0e0c] via-[#0f0e0c]/70 to-[#0f0e0c]" />
        </div>
      )}
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <motion.div {...fade} className="flex items-center gap-3">
          <span className="serif text-sm italic text-[#e4572e]">{no}</span>
          <span className="rule w-10" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">{jp}</span>
        </motion.div>
        {children}
      </div>
    </section>
  );
}

export default function Landing() {
  const { user } = useStore();
  const mounted = useMounted();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace("/home");
  }, [user, router]);

  const hero = MOCK_ANIME[0];
  const showtimes = MOCK_ANIME.filter((a) => a.nextEpisode).slice(0, 4);
  const marquee = [...MOCK_ANIME, ...MOCK_ANIME];

  return (
    <div className="-mx-4 sm:-mx-6">
      {/* ————— FEATURE PRESENTATION ————— */}
      <section className="grain relative flex min-h-[92svh] flex-col overflow-hidden">
        <div className="absolute inset-0">
          <SafeImage src={hero.bannerImage} alt="" className="kenburns h-full w-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e0c] via-[#0f0e0c]/55 to-[#0f0e0c]/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f0e0c]/85 via-transparent to-transparent" />
        </div>
        <span aria-hidden className="tategaki absolute right-5 top-28 hidden select-none text-sm text-zinc-500 lg:block">
          物語を、忘れない。
        </span>

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-4 pb-10 pt-32 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <span className="hanko grid size-7 place-items-center rounded-md text-xs font-bold">回</span>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-zinc-200">
              Kairoku presents
            </p>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="display serif mt-5 max-w-4xl text-[15vw] leading-[0.95] text-white sm:text-8xl md:text-9xl"
          >
            Remember <em>every</em> story.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg"
          >
            The anime journal that tracks what you watch, keeps what you
            felt, and never lets you miss the next episode.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link href="/signup">
              <Button className="px-8 py-3.5 text-base">Start your Kairoku <ArrowRight size={16} /></Button>
            </Link>
            <Link href="/discover">
              <Button variant="outline" className="border-white/25 bg-black/40 px-8 py-3.5 text-base backdrop-blur">
                <Play size={16} /> Explore anime
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* theater marquee — showtimes */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative border-t border-white/15 bg-black/70 backdrop-blur-md"
        >
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-white/10 px-4 sm:px-6 md:grid-cols-4">
            {showtimes.map((a) => (
              <Link key={a.malId} href="/discover" className="group px-4 py-4 first:pl-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#e89a7c]">Coming soon</p>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-100 group-hover:text-white">{a.title}</p>
                <p className="serif mt-0.5 text-lg tabular-nums text-zinc-300">
                  Ep {a.nextEpisode!.number} · {mounted ? timeUntil(a.nextEpisode!.airsAt) : "···"}
                </p>
              </Link>
            ))}
          </div>
        </motion.div>
      </section>

      {/* title marquee */}
      <div className="overflow-hidden border-b border-white/[0.07] py-3" aria-hidden>
        <div className="marquee-track flex w-max gap-8 whitespace-nowrap">
          {marquee.map((a, i) => (
            <span key={i} className="flex items-center gap-8 text-[13px] uppercase tracking-[0.25em] text-zinc-600">
              {a.title} <span className="text-[#e4572e]">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ————— 01 TRACK ————— */}
      <Band no="01" jp="記録 · Now tracking" backdrop={MOCK_ANIME[4].bannerImage}>
        <motion.h2 {...fade} className="display serif mt-5 max-w-3xl text-4xl leading-[1.05] text-zinc-50 sm:text-6xl">
          Your entire journey, <em>on one reel.</em>
        </motion.h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
          {[
            { n: "一", t: "Currently watching", d: "Frieren · Episode 18 of 28. Always exactly where you left off — pick up in one tap." },
            { n: "二", t: "Next episode countdown", d: "Showtimes in your timezone, with a quiet nudge the moment it drops." },
            { n: "三", t: "Separate ratings", d: "Episodes and series rated apart, down to the half star. Your taste, precisely kept." },
          ].map((c, i) => (
            <motion.div key={c.t} {...fade} transition={{ delay: i * 0.08 }} className="group bg-[#12100e] p-8">
              <span className="serif text-5xl text-white/10 transition-colors group-hover:text-[#e4572e]/50">{c.n}</span>
              <h3 className="mt-4 text-lg font-semibold text-zinc-100">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.d}</p>
            </motion.div>
          ))}
        </div>
      </Band>

      {/* ————— 02 UPCOMING ————— */}
      <Band no="02" jp="次回 · Upcoming" backdrop={MOCK_ANIME[8].bannerImage}>
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <motion.h2 {...fade} className="display serif mt-5 text-4xl leading-[1.05] text-zinc-50 sm:text-6xl">
              Never miss <em>the next drop.</em>
            </motion.h2>
            <motion.p {...fade} className="mt-5 max-w-md leading-relaxed text-zinc-400">
              Every airing show you&apos;re watching, lined up by release order
              with a live countdown — and a quiet nudge the moment a new episode
              lands.
            </motion.p>
            <motion.div {...fade}>
              <Link href="/signup" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#e89a7c] hover:text-white">
                Start tracking <ArrowRight size={15} />
              </Link>
            </motion.div>
          </div>
          <motion.figure {...fade} className="card-lift relative rounded-2xl border border-white/10 bg-black/60 p-8 shadow-2xl backdrop-blur sm:p-10">
            <figcaption className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500">
              <span>Upcoming</span>
              <span className="text-[#e89a7c]">Your timezone</span>
            </figcaption>
            <ul className="mt-5 space-y-4">
              {[
                { a: "Frieren", e: "Episode 19", c: "in 4h 12m" },
                { a: "Dandadan", e: "Episode 13", c: "in 2d 4h" },
                { a: "Jujutsu Kaisen", e: "Episode 48", c: "in 2d 9h" },
              ].map((s) => (
                <li key={s.a} className="flex items-baseline justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0">
                  <span>
                    <span className="block text-sm font-semibold text-zinc-100">{s.a}</span>
                    <span className="text-xs text-zinc-500">{s.e}</span>
                  </span>
                  <span className="serif text-lg tabular-nums text-[#e89a7c]">{s.c}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-white/10 pt-4 text-xs tracking-[0.2em] text-zinc-500">
              NEW EPISODE ALERTS · WHILE YOU&apos;RE WATCHING
            </p>
          </motion.figure>
        </div>
      </Band>

      {/* ————— 03 SHOWTIMES ————— */}
      <Band no="03" jp="上映 · Showtimes">
        <motion.h2 {...fade} className="display serif mt-5 max-w-3xl text-4xl leading-[1.05] text-zinc-50 sm:text-6xl">
          The next episode is <em>already counting down.</em>
        </motion.h2>
        <div className="mt-8">
          {[
            { a: "One Piece", e: "Episode 1147 · Sundays 09:30 JST", c: "18h 42m" },
            { a: "Jujutsu Kaisen", e: "Episode 48 · Thursdays 23:56 JST", c: "2d 04h" },
            { a: "Dandadan", e: "Episode 13 · Fridays 00:26 JST", c: "2d 04h" },
            { a: "Shangri-La Frontier", e: "Episode 26 · Sundays 17:00 JST", c: "2d 04h" },
          ].map((s, i) => (
            <ShowtimeRow
              key={s.a}
              index={`0${i + 1}`}
              title={s.a}
              line={s.e}
              countdown={s.c}
              href="/discover"
            />
          ))}
        </div>
      </Band>

      {/* ————— 04 STATS ————— */}
      <Band no="04" jp="物語 · Your story">
        <motion.h2 {...fade} className="display serif mt-5 text-4xl leading-[1.05] text-zinc-50 sm:text-6xl">
          Your taste, <em>on the big screen.</em>
        </motion.h2>
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
          {[
            ["127", "Anime watched"],
            ["1,842", "Episodes watched"],
            ["612h", "Hours immersed"],
            ["Fantasy", "Favorite genre"],
          ].map(([n, l], i) => (
            <motion.div key={l} {...fade} transition={{ delay: i * 0.06 }} className="bg-[#12100e] p-8 sm:p-10">
              <p className="serif text-5xl tabular-nums text-zinc-50 sm:text-6xl">{n}</p>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500">{l}</p>
            </motion.div>
          ))}
        </div>
      </Band>

      {/* ————— 05 REVIEWS ————— */}
      <Band no="05" jp="評論 · Reviews">
        <motion.div {...fade} className="mt-5 flex items-end justify-between gap-4">
          <h2 className="display serif max-w-xl text-4xl leading-[1.05] text-zinc-50 sm:text-6xl">
            Written like <em>letters.</em>
          </h2>
          <Link href="/discover" className="hidden shrink-0 items-center gap-1 text-sm text-zinc-400 hover:text-white sm:inline-flex">
            Discover <ArrowUpRight size={15} />
          </Link>
        </motion.div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { t: "A beautiful ending to an unforgettable journey", b: "Frieren understands something most anime never touch — that grief is just love with nowhere to go. I cried twice.", u: "vaibhav", r: 5 },
            { t: "The pacing finally clicked", b: "Chainsaw Man episode 7 is where the chaos finds its rhythm. Loud, ugly, perfect.", u: "momo", r: 4.5 },
            { t: "Vinland asks the hard question", b: "Can a story about revenge become a story about peace? Yes — and it is devastating.", u: "kenji", r: 5 },
          ].map((r, i) => (
            <motion.article key={r.t} {...fade} transition={{ delay: i * 0.08 }} className="card-lift flex flex-col rounded-2xl border border-white/10 bg-[#141110] p-7">
              <StarsDisplay value={r.r} />
              <h3 className="serif mt-4 text-xl leading-snug text-zinc-50">{r.t}</h3>
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-400">{r.b}</p>
              <footer className="mt-5 flex items-center gap-2 border-t border-white/[0.07] pt-4 text-xs text-zinc-500">
                <span className="grid size-6 place-items-center rounded-full bg-white/10 font-bold text-zinc-300">{r.u[0].toUpperCase()}</span>
                @{r.u} · October 2026
              </footer>
            </motion.article>
          ))}
        </div>
        <div className="mt-16">
          <h3 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.25em] text-zinc-400">
            Top 10 this week <span className="rule w-16" aria-hidden />
          </h3>
          <div className="no-scrollbar snap-row -mx-4 mt-6 flex gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {MOCK_ANIME.slice(0, 8).map((a, i) => (
              <RankCard key={a.malId} anime={a} rank={i + 1} />
            ))}
          </div>
        </div>
      </Band>

      {/* ————— CTA ————— */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6">
        <motion.div
          {...fade}
          className="grain sunset-glow relative overflow-hidden rounded-3xl border border-white/10 p-10 text-center sm:p-20"
        >
          <span className="hanko mx-auto grid size-12 place-items-center rounded-xl text-xl font-bold">始</span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.35em] text-[#e89a7c]">はじめよう · The feature begins</p>
          <h2 className="display serif mx-auto mt-4 max-w-2xl text-4xl leading-tight text-zinc-50 sm:text-6xl">
            Your anime journey deserves to be <em>remembered.</em>
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/signup"><Button className="px-9 py-3.5 text-base">Start your Kairoku</Button></Link>
            <Link href="/discover"><Button variant="outline" className="px-9 py-3.5 text-base">Explore anime</Button></Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/[0.07] py-10 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-bold text-zinc-300">
          <span className="hanko grid size-6 place-items-center rounded-md text-[10px]">回</span> Kairoku
        </p>
        <p className="mt-2 text-xs tracking-wide text-zinc-600">回録 — Remember every story · Data by Jikan / MyAnimeList</p>
      </footer>
    </div>
  );
}
