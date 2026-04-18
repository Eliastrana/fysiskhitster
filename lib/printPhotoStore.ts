import { get, put } from "@vercel/blob";
import path from "node:path";

const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const LATEST_PRINT_JOB_PATHNAME = "print-photo/latest.json";

export type LatestPrintJob = {
  jobId: string;
  imagePathname: string;
  originalName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
};

type PrintJobUpload = {
  fileName: string;
  contentType: string;
  size: number;
  body: Buffer;
};

function sanitizeBaseName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const sanitized = withoutExtension.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "upload";
}

function fileExtension(fileName: string, contentType: string) {
  const directExtension = path.extname(fileName).toLowerCase();
  if (directExtension) return directExtension;

  const extensionMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };

  return extensionMap[contentType] ?? ".img";
}

export function maxUploadBytes() {
  const rawValue = Number(process.env.PRINT_UPLOAD_MAX_BYTES ?? DEFAULT_MAX_UPLOAD_BYTES);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_MAX_UPLOAD_BYTES;
}

function jobIdFromDate(date: Date) {
  const iso = date.toISOString().replace(/[:.]/g, "-");
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${iso}-${randomSuffix}`;
}

export async function createPrintJob(file: PrintJobUpload) {
  const uploadedAt = new Date();
  const jobId = jobIdFromDate(uploadedAt);
  const imagePathname = `print-photo/jobs/${jobId}-${sanitizeBaseName(file.fileName)}${fileExtension(file.fileName, file.contentType)}`;
  const contentType = file.contentType || "application/octet-stream";

  await put(imagePathname, new Blob([new Uint8Array(file.body)], { type: contentType }), {
    access: "private",
    addRandomSuffix: false,
    contentType,
  });

  const job: LatestPrintJob = {
    jobId,
    imagePathname,
    originalName: file.fileName,
    contentType,
    size: file.size,
    uploadedAt: uploadedAt.toISOString(),
  };

  await put(LATEST_PRINT_JOB_PATHNAME, JSON.stringify(job), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  return job;
}

export async function getLatestPrintJob() {
  const result = await get(LATEST_PRINT_JOB_PATHNAME, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  const payload = await new Response(result.stream).text();
  return JSON.parse(payload) as LatestPrintJob;
}

export async function getLatestPrintJobImage() {
  const job = await getLatestPrintJob();
  if (!job) return null;

  const image = await get(job.imagePathname, { access: "private" });
  if (!image || image.statusCode !== 200 || !image.stream) {
    return null;
  }

  return { job, image };
}
