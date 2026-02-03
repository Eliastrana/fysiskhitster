import { NextResponse } from "next/server";

const AUTH = "https://accounts.spotify.com/authorize";

export async function GET() {
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const redirectUri = process.env.SPOTIFY_SETUP_REDIRECT_URI!; // <-- IMPORTANT

    if (!clientId) return NextResponse.json({ error: "Missing SPOTIFY_CLIENT_ID" }, { status: 500 });
    if (!redirectUri)
        return NextResponse.json({ error: "Missing SPOTIFY_SETUP_REDIRECT_URI" }, { status: 500 });

    const scopes = [
        "playlist-read-private",
        "playlist-read-collaborative",
        "user-read-playback-state",
        "user-read-currently-playing",
        "user-modify-playback-state",
    ].join(" ");

    const url = new URL(AUTH);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri); // <-- must match allowlist EXACTLY
    url.searchParams.set("scope", scopes);

    return NextResponse.json({ url: url.toString(), redirectUri });
}
