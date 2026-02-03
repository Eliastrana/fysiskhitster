import { NextResponse } from "next/server";

const TOKEN = "https://accounts.spotify.com/api/token";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: "Missing Spotify client id/secret" }, { status: 500 });
    }

    const redirectUri = process.env.SPOTIFY_SETUP_REDIRECT_URI!;


    const res = await fetch(TOKEN, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri
        })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: "Token exchange failed", detail: json }, { status: 400 });

    // SHOW ONCE: copy refresh_token into SPOTIFY_REFRESH_TOKEN env var
    return NextResponse.json({
        message: "Copy refresh_token into SPOTIFY_REFRESH_TOKEN (server env). Then disable/remove these setup routes.",
        refresh_token: json.refresh_token,
        access_token_preview: json.access_token
    });
}
