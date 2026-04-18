#!/usr/bin/env python3
import json
import os
import sys
import time
import urllib.error
import urllib.request

import serial
from PIL import Image, ImageEnhance, ImageFilter

# ----------------------------
# Remote API config
# ----------------------------
API_BASE = os.getenv("PHOTO_API_BASE", "https://fysiskhitster.vercel.app").rstrip("/")
LATEST_JOB_URL = f"{API_BASE}/api/print-photo/latest"
LATEST_IMAGE_URL = f"{API_BASE}/api/print-photo/latest/image"
PRINT_API_KEY = os.getenv("PRINT_API_KEY", "")
POLL_INTERVAL_SECONDS = float(os.getenv("PHOTO_POLL_INTERVAL", "2"))
STATE_FILE = os.getenv("PHOTO_STATE_FILE", "/tmp/fysiskhitster-last-print-job.txt")
DOWNLOAD_PATH = os.getenv("PHOTO_DOWNLOAD_PATH", "/tmp/fysiskhitster-latest-image")

# ----------------------------
# Printer config
# ----------------------------
PRINTER_PORT = os.getenv("PRINTER_PORT", "/dev/rfcomm0")
PRINTER_BAUD = int(os.getenv("PRINTER_BAUD", "115200"))
PRINTER_WIDTH = int(os.getenv("PRINTER_WIDTH", "384"))
CONTRAST = float(os.getenv("IMAGE_CONTRAST", "2.2"))
SHARPNESS = float(os.getenv("IMAGE_SHARPNESS", "1.4"))
THRESHOLD = int(os.getenv("IMAGE_THRESHOLD", "145"))

ESC = b"\x1b"
GS = b"\x1d"


def log(message: str):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), message, flush=True)


def esc_init() -> bytes:
    return ESC + b"@"


def esc_align(n: int) -> bytes:
    return ESC + b"a" + bytes([n])


def esc_feed(lines: int = 3) -> bytes:
    return b"\n" * max(0, lines)


def esc_cut_partial() -> bytes:
    return GS + b"V" + b"\x01"


def image_to_1bit(img: Image.Image, max_width: int) -> Image.Image:
    img = img.convert("L")

    w, h = img.size
    if w > max_width:
        new_h = int(h * (max_width / w))
        img = img.resize((max_width, new_h), Image.LANCZOS)

    img = img.filter(ImageFilter.SHARPEN)
    img = ImageEnhance.Sharpness(img).enhance(SHARPNESS)
    img = ImageEnhance.Contrast(img).enhance(CONTRAST)

    w, h = img.size
    if w % 8 != 0:
        new_w = w + (8 - (w % 8))
        padded = Image.new("L", (new_w, h), 255)
        padded.paste(img, (0, 0))
        img = padded

    img = img.point(lambda p: 0 if p < THRESHOLD else 255, mode="1")
    return img


def image_to_raster_bytes(img: Image.Image) -> bytes:
    if img.mode != "1":
        raise ValueError("Image must be in 1-bit mode")

    width, height = img.size
    width_bytes = width // 8
    pixels = img.load()
    data = bytearray()

    for y in range(height):
        for xb in range(width_bytes):
            byte = 0
            for bit in range(8):
                x = xb * 8 + bit
                if pixels[x, y] == 0:
                    byte |= 1 << (7 - bit)
            data.append(byte)

    x_l = width_bytes & 0xFF
    x_h = (width_bytes >> 8) & 0xFF
    y_l = height & 0xFF
    y_h = (height >> 8) & 0xFF

    return GS + b"v0" + b"\x00" + bytes([x_l, x_h, y_l, y_h]) + bytes(data)


def make_image_receipt(image_path: str) -> bytes:
    img = Image.open(image_path)
    img = image_to_1bit(img, PRINTER_WIDTH)

    out = bytearray()
    out += esc_init()
    out += esc_align(1)
    out += image_to_raster_bytes(img)
    out += esc_feed(4)
    out += esc_cut_partial()
    return bytes(out)


def print_to_printer(payload: bytes):
    with serial.Serial(PRINTER_PORT, baudrate=PRINTER_BAUD, timeout=5) as printer:
        printer.write(payload)
        printer.flush()
        time.sleep(0.5)


def load_last_job_id() -> str:
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as state_file:
            return state_file.read().strip()
    except FileNotFoundError:
        return ""


def save_last_job_id(job_id: str):
    with open(STATE_FILE, "w", encoding="utf-8") as state_file:
        state_file.write(job_id)


def request_with_headers(url: str):
    headers = {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "User-Agent": "fysiskhitster-pi-printer/1.0",
    }
    if PRINT_API_KEY:
        headers["x-print-key"] = PRINT_API_KEY

    return urllib.request.Request(url, headers=headers)


def fetch_latest_job():
    try:
        with urllib.request.urlopen(request_with_headers(LATEST_JOB_URL), timeout=20) as response:
            if response.status != 200:
                raise RuntimeError(f"Metadata request failed with status {response.status}")
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return {"job": None}
        raise


def download_latest_image() -> str:
    with urllib.request.urlopen(request_with_headers(LATEST_IMAGE_URL), timeout=60) as response:
        if response.status != 200:
            raise RuntimeError(f"Image request failed with status {response.status}")

        with open(DOWNLOAD_PATH, "wb") as image_file:
            image_file.write(response.read())

    return DOWNLOAD_PATH


def process_next_job():
    payload = fetch_latest_job()
    job = payload.get("job")

    if not job:
        return

    job_id = job.get("jobId", "")
    if not job_id:
        return

    if job_id == load_last_job_id():
        return

    log(f"Found new print job {job_id}. Downloading image.")
    image_path = download_latest_image()
    receipt = make_image_receipt(image_path)
    print_to_printer(receipt)
    save_last_job_id(job_id)
    log(f"Printed job {job_id}.")


def main():
    log(f"Polling {LATEST_JOB_URL}")

    while True:
        try:
            process_next_job()
        except KeyboardInterrupt:
            log("Stopping.")
            sys.exit(0)
        except Exception as exc:
            log(f"Error: {exc}")

        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
