import { NextResponse } from "next/server";
import { getSpotifyAccessToken, spotifyApiBase, spotifyYearFromReleaseDate } from "@/lib/spotifyServer";

export async function GET(req: Request) {
    const piKey = req.headers.get("x-pi-key");
    if (!piKey || piKey !== process.env.PI_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getSpotifyAccessToken();
    const api = spotifyApiBase();

    const curRes = await fetch(`${api}/me/player/currently-playing`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    // 204 when nothing is playing
    if (curRes.status === 204) {
        return NextResponse.json({ trackId: null });
    }

    if (!curRes.ok) {
        const detail = await curRes.text();
        return NextResponse.json({ error: "Spotify currently-playing failed", detail }, { status: 400 });
    }

    const cur = await curRes.json();
    const item = cur?.item;
    if (!item) return NextResponse.json({ trackId: null });

    const trackId = item.id as string;
    const title = item.name as string;
    const artist = item.artists?.[0]?.name ?? "Unknown";
    const isrc = item.external_ids?.isrc ?? null;

    const spotifyYear = spotifyYearFromReleaseDate(item.album?.release_date ?? null);

    return NextResponse.json({
        trackId,
        title,
        artist,
        isrc,
        spotifyYear,
    });
}
