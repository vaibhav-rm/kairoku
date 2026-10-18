import { animeSlug } from "./utils";

/**
 * Link builders for a statically-exported app.
 *
 * `output: "export"` requires every path to be known at build time, so the old
 * dynamic segments (`/anime/[slug]`, `/lists/[id]`, `/u/[username]`) can't
 * exist. These helpers keep the call sites tidy and centralised:
 *
 *   /anime/?a=<slug>
 *   /anime/episode/?a=<slug>&ep=<n>
 *   /lists/view/?id=<listId>
 *   /u/?u=<username>
 *
 * The `slug` still starts with the MAL id, so `malIdFromSlug` keeps working.
 */

function enc(value: string): string {
  return encodeURIComponent(value);
}

/** Link to an anime detail page from a MAL id + title. */
export function animeHref(malId: number, title?: string | null): string {
  return `/anime/?a=${enc(animeSlug(malId, title || ""))}`;
}

/** Link to an anime detail page from an existing slug (or a bare id). */
export function animeHrefFromSlug(slug: string | number): string {
  return `/anime/?a=${enc(String(slug))}`;
}

/** Link to a single episode page. */
export function episodeHref(
  malId: number,
  title: string | null | undefined,
  episode: number
): string {
  return `/anime/episode/?a=${enc(animeSlug(malId, title || ""))}&ep=${episode}`;
}

/** Link to a custom list page. */
export function listHref(id: string): string {
  return `/lists/view/?id=${enc(id)}`;
}

/** Link to a user profile. */
export function profileHref(username: string): string {
  return `/u/?u=${enc(username)}`;
}
