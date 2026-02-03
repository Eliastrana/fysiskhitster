import { NextResponse } from "next/server";
import { getSpotifyAccessToken, spotifyApiBase } from "@/lib/spotifyServer";

export async function GET() {
    const token = await getSpotifyAccessToken();
    const api = spotifyApiBase();

    const res = await fetch(`${api}/me/playlists?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}
