import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(episodes: number, minsPerEp = 24) {
  const h = Math.round((episodes * minsPerEp) / 60);
  return h >= 1000 ? `${(h / 1000).toFixed(1)}k` : `${h}`;
}

export function timeUntil(dateStr: string | null | undefined): string {
  if (!dateStr) return "TBA";
  return countdown(new Date(dateStr).getTime(), nowMs());
}

/** Pure countdown formatter that can tick without reading the clock itself. */
export function countdown(target: number, now: number): string {
  const diff = target - now;
  if (diff <= 0) return "Out now";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Indirection so callers don't read the clock inline during render. */
export function nowMs(): number {
  return Date.now();
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function animeSlug(malId: number, title: string) {
  return `${malId}-${slugify(title)}`;
}

export function malIdFromSlug(slug: string): number | null {
  const m = slug.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
