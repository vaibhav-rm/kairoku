"use client";

import { useState, type ImgHTMLAttributes } from "react";

// `next dev` has no Pages Function to serve /api/image, so dev links straight to
// the CDN and falls back to an inline placeholder. Production goes through the
// proxy for a same-origin URL plus the branded SVG on failure.
const DEV = process.env.NODE_ENV === "development";

const DEV_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600'%3E%3Crect width='400' height='600' fill='%23141110'/%3E%3C/svg%3E";

const FALLBACK = DEV ? DEV_PLACEHOLDER : "/api/image?url=";

/** Route fragile hotlinked artwork through our same-origin proxy. */
export function px(src?: string | null): string {
  if (!src || !src.startsWith("http")) return FALLBACK;
  if (DEV) return src;
  if (
    src.includes("cdn.myanimelist.net") ||
    src.includes("media.kitsu.io") ||
    src.includes("media.kitsu.app")
  ) {
    return `/api/image?url=${encodeURIComponent(src)}`;
  }
  return src;
}

/** Image that can never render broken: proxy + branded SVG fallback. */
export function SafeImage({
  src,
  alt = "",
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string | null }) {
  const [err, setErr] = useState(false);
  // next/image can't optimize our dynamic proxy URLs without extra config;
  // a plain lazy img with an onError fallback is the right call here.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={err ? FALLBACK : px(src)}
      alt={alt}
      onError={() => setErr(true)}
      {...rest}
    />
  );
}
