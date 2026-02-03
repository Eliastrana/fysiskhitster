type CacheVal = { year: number | null; expiresAt: number };
const cache = new Map<string, CacheVal>();

let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mbUserAgent() {
    const app = process.env.MUSICBRAINZ_APP_NAME || "spotify-printer-player";
    const ver = process.env.MUSICBRAINZ_APP_VERSION || "1.0.0";
    const contact = process.env.MUSICBRAINZ_CONTACT || "you@example.com";
    return `${app}/${ver} (${contact})`;
}

async function rateLimit() {
    const now = Date.now();
    const delta = now - lastRequestAt;
    if (delta < 1100) await sleep(1100 - delta);
    lastRequestAt = Date.now();
}

function yearFromDate(s?: string | null): number | null {
    if (!s) return null;
    const y = Number(s.slice(0, 4));
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

export async function getMusicBrainzOriginalYear(opts: {
    trackName: string;
    artistName: string;
    isrc?: string | null;
}): Promise<number | null> {
    const trackName = opts.trackName.trim();
    const artistName = opts.artistName.trim();
    const isrc = (opts.isrc || "").trim();

    const key = `${trackName.toLowerCase()}::${artistName.toLowerCase()}::${isrc.toLowerCase()}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return cached.year;

    let year: number | null = null;

    // ISRC-first (more accurate)
    if (isrc) {
        await rateLimit();
        const url = new URL(`https://musicbrainz.org/ws/2/isrc/${encodeURIComponent(isrc)}`);
        url.searchParams.set("inc", "recordings+releases");
        url.searchParams.set("fmt", "json");

        const res = await fetch(url.toString(), { headers: { "User-Agent": mbUserAgent() } });
        if (res.ok) {
            const json = await res.json();
            for (const r of json.recordings || []) {
                const ry = earliestYearFromReleases(r.releases || []);
                if (ry != null && (year == null || ry < year)) year = ry;
            }
        }
    }

    // Fallback: recording search (your old pattern)
    if (year == null) {
        await rateLimit();
        const query = `recording:"${trackName}" AND artist:"${artistName}"`;
        const url = new URL("https://musicbrainz.org/ws/2/recording/");
        url.searchParams.set("query", query);
        url.searchParams.set("fmt", "json");

        const res = await fetch(url.toString(), { headers: { "User-Agent": mbUserAgent() } });
        if (res.ok) {
            const data = await res.json();
            const recordings = data.recordings || [];
            for (const rec of recordings) {
                const y = yearFromDate(rec["first-release-date"]);
                if (y != null && (year == null || y < year)) year = y;
            }
        }
    }

    cache.set(key, { year, expiresAt: now + 24 * 60 * 60 * 1000 });
    return year;
}
