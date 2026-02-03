import { NextResponse } from "next/server";
import { getSpotifyAccessToken, spotifyApiBase } from "@/lib/spotifyServer";

// Pause Playback requires Premium. :contentReference[oaicite:7]{index=7}
export async function POST(req: Request) {
    const { action } = await req.json(); // "pause" | "resume"

    const token = await getSpotifyAccessToken();
    const api = spotifyApiBase();

    if (action === "pause") {
        const res = await fetch(`${api}/me/player/pause`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` }
        });
        const detail = await res.text();
        return NextResponse.json({ ok: res.ok, status: res.status, detail }, { status: 200 });
    }

    // resume without context
    const res = await fetch(`${api}/me/player/play`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
    });
    const detail = await res.text();
    return NextResponse.json({ ok: res.ok, status: res.status, detail }, { status: 200 });
}
