const SPOTIFY_TOKEN = "https://accounts.spotify.com/api/token";
const SPOTIFY_API = "https://api.spotify.com/v1";

type TokenCache = { accessToken: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

export function spotifyApiBase() {
    return SPOTIFY_API;
}

export async function getSpotifyAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (tokenCache && tokenCache.expiresAt > now + 15) return tokenCache.accessToken;

    const clientId = requireEnv("SPOTIFY_CLIENT_ID");
    const clientSecret = requireEnv("SPOTIFY_CLIENT_SECRET");
    const refreshToken = requireEnv("SPOTIFY_REFRESH_TOKEN");

    const res = await fetch(SPOTIFY_TOKEN, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken
        })
    });

    if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Spotify refresh failed (${res.status}): ${detail}`);
    }

    const json = await res.json();
    const accessToken = json.access_token as string;
    const expiresIn = (json.expires_in as number) ?? 3600;

    tokenCache = {
        accessToken,
        expiresAt: now + expiresIn
    };

    return accessToken;
}

export function spotifyYearFromReleaseDate(releaseDate?: string | null): number | null {
    if (!releaseDate) return null;
    const y = Number(releaseDate.slice(0, 4));
    return Number.isFinite(y) ? y : null;
}
