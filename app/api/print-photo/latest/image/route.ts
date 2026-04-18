import { NextRequest, NextResponse } from "next/server";
import { getLatestPrintJobImage } from "@/lib/printPhotoStore";

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

  const result = await getLatestPrintJobImage();
  if (!result) {
    return NextResponse.json({ error: "No image available." }, { status: 404 });
  }

  return new NextResponse(result.image.stream, {
    headers: {
      "Content-Type": result.job.contentType,
      "Cache-Control": "no-store, max-age=0",
      "X-Print-Job-Id": result.job.jobId,
      "X-Print-Uploaded-At": result.job.uploadedAt,
      "Content-Disposition": `inline; filename="${result.job.originalName}"`,
    },
  });
}
