// Cloudflare Pages Function — same-origin artwork proxy.
// Route: GET /api/image?url=<https image url>
//
// Direct hotlinks to provider CDNs get blocked by tracking protection /
// opaque-response blocking in some browsers; serving the bytes ourselves
// (correct MIME, our cache headers) fixes that. Ported from the former
// Next.js route handler.

// Hosts we are willing to proxy artwork for. An open image proxy is an
// abuse vector, so this stays a tight allowlist (Kitsu CDN only).
const ALLOWED = new Set([
  "media.kitsu.app",
  "media.kitsu.io",
]);

const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#241210"/><stop offset="1" stop-color="#141110"/>
</linearGradient></defs>
<rect width="400" height="600" fill="url(#g)"/>
<rect x="160" y="220" width="80" height="80" rx="18" fill="#e4572e"/>
<text x="200" y="278" font-family="serif" font-size="44" font-weight="bold" text-anchor="middle" fill="#fff8f0">回</text>
<text x="200" y="340" font-family="sans-serif" font-size="20" letter-spacing="6" text-anchor="middle" fill="#8a8078">KAIROKU</text>
</svg>`;

function placeholder(): Response {
  return new Response(PLACEHOLDER, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const target = new URL(context.request.url).searchParams.get("url") || "";
  if (!target) return placeholder();

  let host: string;
  try {
    const u = new URL(target);
    if (u.protocol !== "https:") return placeholder();
    host = u.hostname;
  } catch {
    return placeholder();
  }
  if (!ALLOWED.has(host)) return placeholder();

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "Kairoku/1.0 (anime journal)",
        Referer: "https://kitsu.io/",
        Accept: "image/*",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok || !upstream.body) return placeholder();
    const type = upstream.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return placeholder();
    return new Response(upstream.body, {
      headers: {
        "Content-Type": type.split(";")[0],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return placeholder();
  }
}
