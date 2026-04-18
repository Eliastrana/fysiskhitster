import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { createPrintJob, maxUploadBytes } from "@/lib/printPhotoStore";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

async function runPrintScript(file: File) {
  const printScript = process.env.PRINT_IMAGE_SCRIPT;
  if (!printScript) return null;

  const tempFilePath = path.join(os.tmpdir(), `print-photo-${Date.now()}-${file.name || "upload.img"}`);
  const pythonBin = process.env.PYTHON_BIN ?? "python3";

  await writeFile(tempFilePath, Buffer.from(await file.arrayBuffer()));

  try {
    const { stdout, stderr } = await execFileAsync(pythonBin, [printScript, tempFilePath], {
      timeout: 60_000,
    });

    return {
      ok: true,
      stdout: stdout.trim() || null,
      stderr: stderr.trim() || null,
    };
  } catch (error: unknown) {
    const detail =
        typeof error === "object" && error && "stderr" in error && typeof error.stderr === "string"
            ? error.stderr.trim()
            : error instanceof Error
                ? error.message
                : "Unknown print error";

    throw new Error(detail || "Unknown print error");
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("photo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo file was provided." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "The uploaded file must be an image." }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "The uploaded image is empty." }, { status: 400 });
  }

  if (file.size > maxUploadBytes()) {
    return NextResponse.json(
        { error: `The uploaded image is too large. Max size is ${Math.floor(maxUploadBytes() / (1024 * 1024))}MB.` },
        { status: 413 }
    );
  }

  try {
    const job = await createPrintJob(file);
    const printResult = await runPrintScript(file);

    return NextResponse.json({
      ok: true,
      job,
      printed: !!printResult,
      printResult,
    });
  } catch (error) {
    return NextResponse.json(
        {
          error: "The image upload failed.",
          detail: error instanceof Error ? error.message : "Unknown upload error",
        },
        { status: 500 }
    );
  }
}
