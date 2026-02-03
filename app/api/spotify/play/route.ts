import { NextResponse } from "next/server";
import { getSpotifyAccessToken, spotifyApiBase } from "@/lib/spotifyServer";

// Start/Resume Playback requires Premium. :contentReference[oaicite:6]{index=6}
export async function POST(req: Request) {
    const { playlistUri } = await req.json();

    if (!playlistUri) {
        return NextResponse.json({ error: "Missing playlistUri" }, { status: 400 });
    }

    const token = await getSpotifyAccessToken();
    const api = spotifyApiBase();

    const res = await fetch(`${api}/me/player/play`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ context_uri: playlistUri })
    });

    const detail = await res.text();
    return NextResponse.json({ ok: res.ok, status: res.status, detail }, { status: 200 });
}
