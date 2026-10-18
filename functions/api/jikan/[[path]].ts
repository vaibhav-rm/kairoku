// Cloudflare Pages Function — same-origin proxy for the anime metadata
// provider. Ported from the former Next.js route handler so the statically
// exported app can still reach Jikan without browser CORS issues.
//
// Route: GET /api/jikan/<...path>
// (This file's directory is the route: functions/api/jikan/[[path]].ts)

const UPSTREAM = "https://api.jikan.moe/v4";
const TTL = 30 * 60 * 1000; // 30 min fresh
const MAX_ENTRIES = 400;
const CACHE_HEADERS = "public, s-maxage=1800, stale-while-revalidate=86400";
// Browser-like UA: the upstream sits behind Cloudflare, which challenges
// or blocks non-browser user agents.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Kairoku/1.0";

interface Entry {
  at: number;
  body: unknown;
}

// Best-effort in-isolate cache. The client also caches responses in
// localStorage, so a cold isolate just means one extra upstream fetch.
const cache = new Map<string, Entry>();

function prune() {
  if (cache.size <= MAX_ENTRIES) return;
  const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at);
  for (const [k] of oldest.slice(0, cache.size - MAX_ENTRIES)) cache.delete(k);
}

function json(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
}

interface Context {
  request: Request;
  params: { path?: string | string[] };
}

export async function onRequestGet(context: Context): Promise<Response> {
  const raw = context.params.path;
  const path = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (path.length === 0) {
    return json({ error: "missing path" }, { status: 400 });
  }

  const key = `/${path.join("/")}${new URL(context.request.url).search}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return json(hit.body, {
      headers: { "x-kairoku-cache": "hit", "Cache-Control": CACHE_HEADERS },
    });
  }

  try {
    let upstream: Response | null = null;
    let lastErr = "";
    // One immediate retry for network-level failures (not HTTP statuses).
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        upstream = await fetch(`${UPSTREAM}${key}`, {
          headers: { "User-Agent": UA, Accept: "application/json" },
          signal: AbortSignal.timeout(12000),
        });
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    if (!upstream) throw new Error(lastErr || "upstream unreachable");

    if (upstream.status === 429 && hit) {
      return json(hit.body, { headers: { "x-kairoku-cache": "stale-429" } });
    }
    // Legit "no such record": pass it through so callers can tell a missing
    // title apart from a dead provider.
    if (upstream.status === 404) {
      const body = await upstream.json().catch(() => ({ error: "not found" }));
      return json(body, {
        status: 404,
        headers: { "x-kairoku-cache": "miss-404" },
      });
    }
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

    const body = (await upstream.json()) as unknown;
    cache.set(key, { at: Date.now(), body });
    prune();
    return json(body, {
      headers: { "x-kairoku-cache": "miss", "Cache-Control": CACHE_HEADERS },
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    if (hit) {
      return json(hit.body, { headers: { "x-kairoku-cache": "stale-error" } });
    }
    return json(
      { error: "anime provider unreachable", reason },
      { status: 502 }
    );
  }
}
