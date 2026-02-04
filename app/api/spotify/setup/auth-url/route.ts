import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { stateCookieName } from "@/lib/tokenCookie";

export const runtime = "nodejs";

const AUTH_URL = "https://accounts.spotify.com/authorize";

function requireEnv(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

function base64url(buf: Buffer) {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function GET() {
    const clientId = requireEnv("SPOTIFY_CLIENT_ID");
    const redirectUri = requireEnv("SPOTIFY_SETUP_REDIRECT_URI");

    const scopes = [
        "playlist-read-private",
        "playlist-read-collaborative",
        "user-read-playback-state",
        "user-read-currently-playing",
        "user-modify-playback-state",
    ].join(" ");

    // CSRF protection
    const state = base64url(crypto.randomBytes(16));

    const url = new URL(AUTH_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopes);
    url.searchParams.set("state", state);

    const jar = await cookies();
    jar.set(stateCookieName(), state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60, // 10 min
    });

    return NextResponse.json({ url: url.toString() });
}
