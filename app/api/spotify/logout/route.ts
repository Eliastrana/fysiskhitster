import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refreshCookieName } from "@/lib/tokenCookie";

export const runtime = "nodejs";

export async function POST() {
    const jar = await cookies();
    jar.set(refreshCookieName(), "", { path: "/", maxAge: 0 });
    return NextResponse.json({ ok: true });
}
