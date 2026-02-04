import { cookies } from "next/headers";
import { refreshCookieName, unsealRefreshToken } from "@/lib/tokenCookie";

const TOKEN_URL = "https://accounts.spotify.com/api/token";

// Optional tiny in-memory cache (per server instance)
let tokenCache:
    | { accessToken: string; expiresAt: number; refreshTokenHash: string }
    | null = null;

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

function hashToken(s: string) {
    // short hash so cache is per-user-token
    return Buffer.from(
        awaitableHash(s),
        "hex"
    ).toString("hex");
}
function awaitableHash(s: string) {
    // no external deps; keep it sync
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

export async function getUserSpotifyAccessToken(): Promise<string> {
    const jar = await cookies();
    const sealed = jar.get(refreshCookieName())?.value;
    if (!sealed) {
        throw new Error("Not logged in: missing spotify refresh token cookie");
    }

    const refreshToken = unsealRefreshToken(sealed);
    const refreshHash = awaitableHash(refreshToken);

    const now = Math.floor(Date.now() / 1000);
    if (tokenCache && tokenCache.refreshTokenHash === refreshHash && tokenCache.expiresAt > now + 15) {
        return tokenCache.accessToken;
    }

    const clientId = requireEnv("SPOTIFY_CLIENT_ID");
    const clientSecret = requireEnv("SPOTIFY_CLIENT_SECRET");

    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    });

    const text = await res.text();
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = null;
    }

    if (!res.ok || !json?.access_token) {
        throw new Error(`Spotify refresh failed (${res.status}): ${text}`);
    }

    const accessToken = json.access_token as string;
    const expiresIn = (json.expires_in as number) ?? 3600;

    tokenCache = {
        accessToken,
        expiresAt: now + expiresIn,
        refreshTokenHash: refreshHash,
    };

    return accessToken;
}
