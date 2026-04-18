import { NextRequest, NextResponse } from "next/server";
import { getLatestPrintJob } from "@/lib/printPhotoStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const expectedKey = process.env.PRINT_API_KEY;
  if (!expectedKey) return true;
  return request.headers.get("x-print-key") === expectedKey;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await getLatestPrintJob();

  return NextResponse.json(
      {
        job,
        imageUrl: job ? new URL("/api/print-photo/latest/image", request.url).toString() : null,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
  );
}
