import { NextRequest, NextResponse } from "next/server";

type CacheVal = { year: number | null; expiresAt: number };
const cache = new Map<string, CacheVal>();

let lastRequestAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function rateLimit() {
    const now = Date.now();
    const delta = now - lastRequestAt;
    if (delta < 1100) await sleep(1100 - delta);
    lastRequestAt = Date.now();
}

function mbUserAgent() {
    const app = process.env.MUSICBRAINZ_APP_NAME || "spotify-printer-player";
    const ver = process.env.MUSICBRAINZ_APP_VERSION || "1.0.0";
    const contact = process.env.MUSICBRAINZ_CONTACT || "you@example.com";
    return `${app}/${ver} (${contact})`;
}

function yearFromDate(s?: string | null): number | null {
    if (!s) return null;
    const y = Number(String(s).slice(0, 4));
    return Number.isFinite(y) ? y : null;
}

function earliestYearFromReleases(releases: any[]): number | null {
    let best: number | null = null;
    for (const rel of releases || []) {
        const y = yearFromDate(rel?.date);
        if (y == null) continue;
        if (best == null || y < best) best = y;
    }
    return best;
}

async function safeFetchJson(url: string) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": mbUserAgent(),
                Accept: "application/json",
            },
        });

        const text = await res.text();
        let json: any = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            json = null;
        }

        return { ok: res.ok, status: res.status, json };
    } catch {
        return { ok: false, status: 0, json: null };
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const trackName = searchParams.get("trackName")?.trim();
    const artistName = searchParams.get("artistName")?.trim();
    const isrc = searchParams.get("isrc")?.trim() || "";

    if (!trackName || !artistName) {
        return NextResponse.json({ error: "Missing trackName or artistName" }, { status: 400 });
    }

    const cacheKey = `${trackName.toLowerCase()}::${artistName.toLowerCase()}::${isrc.toLowerCase()}`;
    const now = Date.now();

    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        return NextResponse.json({ originalReleaseYear: cached.year, cached: true });
    }

    let year: number | null = null;

    // 1) ISRC lookup
    if (isrc) {
        await rateLimit();
        const url = new URL(`https://musicbrainz.org/ws/2/isrc/${encodeURIComponent(isrc)}`);
        url.searchParams.set("inc", "recordings+releases");
        url.searchParams.set("fmt", "json");

        const r = await safeFetchJson(url.toString());
        if (r.ok && r.json) {
            for (const rec of r.json.recordings || []) {
                const ry = earliestYearFromReleases(rec.releases || []);
                if (ry != null && (year == null || ry < year)) year = ry;

                const fry = yearFromDate(rec["first-release-date"]);
                if (fry != null && (year == null || fry < year)) year = fry;
            }
        }
    }

    // 2) Fallback: recording search (WAIT before second call)
    if (year == null) {
        await rateLimit();
        const query = `recording:"${trackName}" AND artist:"${artistName}"`;
        const url = new URL("https://musicbrainz.org/ws/2/recording/");
        url.searchParams.set("query", query);
        url.searchParams.set("fmt", "json");

        const r = await safeFetchJson(url.toString());
        if (r.ok && r.json) {
            for (const rec of r.json.recordings || []) {
                const y = yearFromDate(rec["first-release-date"]);
                if (y != null && (year == null || y < year)) year = y;
            }
        }
    }

    // cache: 24h if found, 10 min if not
    const ttlMs = year == null ? 10 * 60 * 1000 : 24 * 60 * 60 * 1000;
    cache.set(cacheKey, { year, expiresAt: now + ttlMs });

    return NextResponse.json({ originalReleaseYear: year, cached: false });
}
