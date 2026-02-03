import { NextRequest, NextResponse } from "next/server";
import { getMusicBrainzOriginalYear } from "@/lib/musicbrainz";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const trackName = searchParams.get("trackName");
    const artistName = searchParams.get("artistName");
    const isrc = searchParams.get("isrc");

    if (!trackName || !artistName) {
        return NextResponse.json({ error: "Missing trackName or artistName" }, { status: 400 });
    }

    const year = await getMusicBrainzOriginalYear({ trackName, artistName, isrc });
    return NextResponse.json({ originalReleaseYear: year });
}
