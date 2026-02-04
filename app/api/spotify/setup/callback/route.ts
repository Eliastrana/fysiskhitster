import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refreshCookieName, sealRefreshToken, stateCookieName } from "@/lib/tokenCookie";

export const runtime = "nodejs";

const TOKEN_URL = "https://accounts.spotify.com/api/token";

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url);

    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL(`/?spotify_error=${encodeURIComponent(error)}`, url.origin));
    }

    if (!code) {
        return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    // Validate state (CSRF)
    const jar = await cookies();
    const expectedState = jar.get(stateCookieName())?.value;
    if (!expectedState || !returnedState || expectedState !== returnedState) {
        return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    const clientId = requireEnv("SPOTIFY_CLIENT_ID");
    const clientSecret = requireEnv("SPOTIFY_CLIENT_SECRET");
    const redirectUri = requireEnv("SPOTIFY_SETUP_REDIRECT_URI");

    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
        }),
    });

    const text = await res.text();
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = null;
    }

    if (!res.ok) {
        return NextResponse.json({ error: "Token exchange failed", detail: text }, { status: 400 });
    }

    const refreshToken = json?.refresh_token as string | undefined;

    // Spotify might not return refresh_token in some edge cases
    // For first-time auth it should, but handle gracefully.
    if (!refreshToken) {
        return NextResponse.json(
            { error: "No refresh_token returned. Try re-authorizing (remove access in Spotify account apps)." },
            { status: 400 }
        );
    }

    // Store encrypted refresh token in HttpOnly cookie
    jar.set(refreshCookieName(), sealRefreshToken(refreshToken), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days (refresh tokens can last longer; you can extend)
    });

    // Clear the state cookie
    jar.set(stateCookieName(), "", { path: "/", maxAge: 0 });

    // Redirect back to app
    return NextResponse.redirect(new URL("/?spotify_authed=1", url.origin));
}
