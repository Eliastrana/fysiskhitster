import { NextResponse } from "next/server";
import { getSpotifyAccessToken, spotifyApiBase } from "@/lib/spotifyServer";

export async function GET() {
    const token = await getSpotifyAccessToken();
    const api = spotifyApiBase();

    const res = await fetch(`${api}/me/player`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    // 204 if no active device
    if (res.status === 204) return NextResponse.json({ active: false });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}
