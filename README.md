This is a [Next.js](https://nextjs.org) project that powers the Fysisk Hitster controller UI and a photo upload flow for a Raspberry Pi thermal printer.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The main Spotify controller lives at `/`, and the photo upload screen lives at `/print-photo`.

## Photo Upload And Print

`/print-photo` lets a user either upload an image or take a picture directly from a phone browser. The page sends the image to `POST /api/print-photo`, which creates a new print job in Vercel Blob storage.

The Raspberry Pi flow should poll these endpoints:

- `GET /api/print-photo/latest`: returns the latest print-job metadata
- `GET /api/print-photo/latest/image`: streams the latest uploaded image bytes

Environment variables for the upload/print flow:

- `BLOB_READ_WRITE_TOKEN`: required in Vercel for persistent image storage
- `PRINT_UPLOAD_MAX_BYTES`: max upload size in bytes, defaults to 15MB
- `PRINT_IMAGE_WIDTH`: resize width before storing/printing, defaults to 384
- `PRINT_IMAGE_QUALITY`: JPEG quality for the compressed thermal-printer image, defaults to 55
- `PRINT_API_KEY`: optional shared secret; when set, the Pi must send it as `x-print-key` to the `latest` endpoints
- `PRINT_IMAGE_SCRIPT`: optional absolute path to a local Python script if the app is self-hosted and should print immediately after upload
- `PYTHON_BIN`: Python executable to use when running `PRINT_IMAGE_SCRIPT`, defaults to `python3`

## Raspberry Pi Poller

A standalone Pi poller is included at `pi/print_latest_photo.py`.

It polls the deployed site, downloads the newest image only once per job ID, and sends it to the thermal printer using the same ESC/POS raster flow as the original script.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
