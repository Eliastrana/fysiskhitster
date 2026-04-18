import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { createPrintJob, maxUploadBytes } from "@/lib/printPhotoStore";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const DEFAULT_PRINT_IMAGE_WIDTH = 384;
const DEFAULT_PRINT_IMAGE_QUALITY = 55;

function printImageWidth() {
  const rawValue = Number(process.env.PRINT_IMAGE_WIDTH ?? DEFAULT_PRINT_IMAGE_WIDTH);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_PRINT_IMAGE_WIDTH;
}

function printImageQuality() {
  const rawValue = Number(process.env.PRINT_IMAGE_QUALITY ?? DEFAULT_PRINT_IMAGE_QUALITY);
  return Number.isFinite(rawValue) && rawValue > 0 && rawValue <= 100 ? rawValue : DEFAULT_PRINT_IMAGE_QUALITY;
}

async function compressForThermalPrinter(file: File) {
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const { data, info } = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: printImageWidth(),
        fit: "inside",
        withoutEnlargement: true,
      })
      .grayscale()
      .jpeg({
        quality: printImageQuality(),
        mozjpeg: true,
      })
      .toBuffer({ resolveWithObject: true });

  return {
    fileName: `${path.parse(file.name).name || "print-photo"}.jpg`,
    contentType: "image/jpeg",
    size: info.size,
    body: data,
  };
}

async function runPrintScript(fileName: string, body: Buffer) {
  const printScript = process.env.PRINT_IMAGE_SCRIPT;
  if (!printScript) return null;

  const tempFilePath = path.join(os.tmpdir(), `print-photo-${Date.now()}-${fileName || "upload.jpg"}`);
  const pythonBin = process.env.PYTHON_BIN ?? "python3";

  await writeFile(tempFilePath, body);

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
    const processedImage = await compressForThermalPrinter(file);
    const job = await createPrintJob(processedImage);
    const printResult = await runPrintScript(processedImage.fileName, processedImage.body);

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
