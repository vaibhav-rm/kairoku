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
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Out now";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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
