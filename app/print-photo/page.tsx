"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";

type UploadResponse = {
  ok?: boolean;
  error?: string;
  detail?: string;
  job?: {
    jobId: string;
    originalName: string;
    uploadedAt: string;
  };
  printed?: boolean;
  printResult?: {
    ok?: boolean;
    stdout?: string | null;
    stderr?: string | null;
  } | null;
};

export default function PrintPhotoPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [status, setStatus] = useState<string>("Velg et bilde eller ta et nytt bilde.");
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedFile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setResult(null);
    setStatus(nextFile ? "Klar til opplasting." : "Velg et bilde eller ta et nytt bilde.");
  }

  async function handleSubmit() {
    if (!selectedFile) {
      setStatus("Velg et bilde først.");
      return;
    }

    setIsSubmitting(true);
    setResult(null);
    setStatus("Laster opp bildet…");

    try {
      const formData = new FormData();
      formData.append("photo", selectedFile);

      const response = await fetch("/api/print-photo", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => ({}))) as UploadResponse;
      setResult(data);

      if (!response.ok) {
        setStatus(data.error ?? `Opplasting feilet (${response.status}).`);
        return;
      }

      setStatus(
          data.printed
              ? "Bildet ble sendt til skriveren."
              : "Bildet er lagret. Raspberry Pi-en kan hente det fra API-et nå."
      );
    } catch {
      setStatus("Kunne ikke laste opp bildet. Prøv igjen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.22),_transparent_28%)]" />
        <div className="absolute top-16 right-[-70px] h-64 w-64 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[-80px] h-72 w-72 rounded-full bg-teal-300/15 blur-3xl" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/65">Photo Printer</div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Last opp bildet som skal printes</h1>
            </div>

            <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
            >
              Tilbake
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-bold">Velg eller ta et bilde</div>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/78">
                    På mobil vil kamera åpnes direkte i nettlesere som støtter det. På laptop eller nettbrett kan du
                    velge et bilde fra bildebiblioteket.
                  </p>
                </div>
              </div>

              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/25 bg-black/15 px-6 py-10 text-center transition hover:bg-black/20">
                <span className="text-base font-semibold">Ta bilde eller velg foto</span>
                <span className="mt-2 text-sm text-white/70">
                  JPG, PNG, HEIC eller andre vanlige bildefiler fungerer.
                </span>
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="sr-only"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!selectedFile || isSubmitting}
                    className="inline-flex min-w-40 items-center justify-center rounded-full bg-amber-300 px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/55"
                >
                  {isSubmitting ? "Sender…" : "Send til printer"}
                </button>

                <div className="text-sm text-white/78">
                  {selectedFile ? (
                      <>
                        Valgt fil: <span className="font-semibold text-white">{selectedFile.name}</span>
                      </>
                  ) : (
                      "Ingen fil valgt ennå."
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/85">
                {status}
              </div>

              {result?.job ? (
                  <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-white/90">
                    Siste printjobb: <span className="font-mono text-xs sm:text-sm">{result.job.jobId}</span>
                  </div>
              ) : null}

              {result?.detail ? (
                  <div className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-400/10 px-4 py-3 text-sm text-white/90">
                    {result.detail}
                  </div>
              ) : null}
            </section>

            <section className="rounded-[2rem] border border-white/15 bg-white/8 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
              <div className="text-xl font-bold">Forhåndsvisning</div>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Bildet under er det som lastes opp. Raspberry Pi-en kan hente siste bilde via
                <span className="mx-1 font-mono text-xs sm:text-sm">/api/print-photo/latest</span>
                og selve bildefilen via
                <span className="mx-1 font-mono text-xs sm:text-sm">/api/print-photo/latest/image</span>.
              </p>

              <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30">
                {previewUrl ? (
                    <Image
                        src={previewUrl}
                        alt="Preview of the selected photo"
                        width={1200}
                        height={1500}
                        unoptimized
                        className="aspect-[4/5] w-full object-cover"
                    />
                ) : (
                    <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm text-white/55">
                      Velg et bilde for å se en forhåndsvisning her.
                    </div>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                  <div className="text-sm font-semibold text-white">Mobilvennlig</div>
                  <div className="mt-2 text-sm leading-6 text-white/72">
                    Kamera-knappen bruker <span className="font-mono">capture=&quot;environment&quot;</span> når
                    nettleseren støtter det.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                  <div className="text-sm font-semibold text-white">Pi-handoff</div>
                  <div className="mt-2 text-sm leading-6 text-white/72">
                    Siste printjobb lagres i Vercel Blob, og Pi-en kan hente den ved polling mot API-et.
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
  );
}
