import { NextResponse, type NextRequest } from "next/server";

const UPSTREAM = "https://api.jikan.moe/v4";
const TTL = 30 * 60 * 1000; // 30 min fresh
const MAX_ENTRIES = 400;
// Browser-like UA: the upstream sits behind Cloudflare, which challenges
// or blocks non-browser user agents.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Kairoku/1.0";

interface Entry {
  at: number;
  body: unknown;
}
const cache = new Map<string, Entry>();

function prune() {
  if (cache.size <= MAX_ENTRIES) return;
  const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at);
  for (const [k] of oldest.slice(0, cache.size - MAX_ENTRIES)) cache.delete(k);
}

// Same-origin proxy for the anime metadata provider.
// Why: browsers hit CORS failures / blocks against the public API;
// server-to-server has none. Serves fresh cache instantly and falls
// back to stale cache on upstream 429s/errors, so the UI never breaks.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return NextResponse.json({ error: "missing path" }, { status: 400 });
  }
  const key = `/${path.join("/")}${req.nextUrl.search}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json(hit.body, {
      headers: { "x-kairoku-cache": "hit", "Cache-Control": "public, s-maxage=1800" },
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
      return NextResponse.json(hit.body, { headers: { "x-kairoku-cache": "stale-429" } });
    }
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const body = (await upstream.json()) as unknown;
    cache.set(key, { at: Date.now(), body });
    prune();
    return NextResponse.json(body, {
      headers: { "x-kairoku-cache": "miss", "Cache-Control": "public, s-maxage=1800" },
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error(`[jikan-proxy] ${key} failed: ${reason}`);
    if (hit) {
      return NextResponse.json(hit.body, { headers: { "x-kairoku-cache": "stale-error" } });
    }
    return NextResponse.json(
      { error: "anime provider unreachable", reason },
      { status: 502 }
    );
  }
}
