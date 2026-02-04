import { NextResponse } from "next/server";
import { getUserSpotifyAccessToken } from "@/lib/spotifyUser";

export const runtime = "nodejs";

export async function GET() {
    try {
        const token = await getUserSpotifyAccessToken();

        const res = await fetch("https://api.spotify.com/v1/me/player", {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 204) return NextResponse.json({ active: false });

        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch (e: any) {
        return NextResponse.json({ error: e.message ?? "Unauthorized" }, { status: 401 });
    }
}
