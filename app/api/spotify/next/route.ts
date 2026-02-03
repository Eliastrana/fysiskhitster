import { NextResponse } from "next/server";
import { getSpotifyAccessToken, spotifyApiBase } from "@/lib/spotifyServer";

// Skip to Next requires Premium + proper scopes. :contentReference[oaicite:8]{index=8}
export async function POST() {
    const token = await getSpotifyAccessToken();
    const api = spotifyApiBase();

    const res = await fetch(`${api}/me/player/next`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });

    const detail = await res.text();
    return NextResponse.json({ ok: res.ok, status: res.status, detail }, { status: 200 });
}
