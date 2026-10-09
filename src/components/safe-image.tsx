"use client";

import { useState, type ImgHTMLAttributes } from "react";

/** Route fragile hotlinked artwork through our same-origin proxy. */
export function px(src?: string | null): string {
  if (!src || !src.startsWith("http")) return "/api/image?url=";
  if (src.includes("cdn.myanimelist.net") || src.includes("media.kitsu.io")) {
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
      src={err ? "/api/image?url=" : px(src)}
      alt={alt}
      onError={() => setErr(true)}
      {...rest}
    />
  );
}
