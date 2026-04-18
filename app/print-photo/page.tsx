"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";

type UploadResponse = {
  ok?: boolean;
};

export default function PrintPhotoPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didSend, setDidSend] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (!showSuccessOverlay) return;

    const resetTimer = window.setTimeout(() => {
      setShowSuccessOverlay(false);
      setSelectedFile(null);
      setDidSend(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }, 2200);

    return () => clearTimeout(resetTimer);
  }, [showSuccessOverlay]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setDidSend(false);
  }

  async function handleSubmit() {
    if (!selectedFile || isSubmitting) return;

    setIsSubmitting(true);
    setDidSend(false);

    try {
      const formData = new FormData();
      formData.append("photo", selectedFile);

      const response = await fetch("/api/print-photo", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => ({}))) as UploadResponse;
      if (response.ok && data.ok) {
        setDidSend(true);
        setShowSuccessOverlay(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <main className="h-[100dvh] overflow-hidden bg-[#0f1115]">
        <AnimatePresence>
          {showSuccessOverlay ? (
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]"
              >
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="px-8 text-center text-3xl font-semibold text-white sm:text-5xl"
                >
                  Du så veldig bra ut 🥵
                </motion.div>
              </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center px-5 py-4 sm:px-6 sm:py-5">
          <motion.div
              layout
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`flex h-full w-full flex-col ${previewUrl ? "" : "justify-center"}`}
          >
            <AnimatePresence mode="wait">
              {previewUrl ? (
                  <motion.div
                      key={previewUrl}
                      initial={{ opacity: 0, y: 18, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 0.98 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="mb-4 min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-white/6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
                  >
                    <Image
                        src={previewUrl}
                        alt="Selected photo"
                        width={1400}
                        height={1750}
                        unoptimized
                        className="h-full w-full object-contain"
                    />
                  </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:gap-4">
              <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="sr-only"
              />

              <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative h-14 w-full overflow-hidden rounded-full bg-white px-6 text-base font-semibold text-black shadow-[0_10px_40px_rgba(255,255,255,0.12)]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                      key={selectedFile ? "replace" : "upload"}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 flex items-center justify-center"
                  >
                    {selectedFile ? "Bytt bilde" : "Last opp bilde"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>

              <AnimatePresence>
                {selectedFile ? (
                    <motion.button
                        key="send-button"
                        type="button"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: didSend ? 1.01 : 1,
                          backgroundColor: didSend ? "rgb(187 247 208)" : "rgb(250 204 21)",
                        }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        whileTap={{ scale: 0.985 }}
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="relative h-14 w-full overflow-hidden rounded-full px-6 text-base font-semibold text-black shadow-[0_18px_55px_rgba(250,204,21,0.18)] disabled:cursor-not-allowed disabled:opacity-100"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {isSubmitting ? (
                            <motion.span
                                key="sending"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 flex items-center justify-center"
                            >
                              <motion.span
                                  animate={{ x: ["-140%", "140%"] }}
                                  transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent blur-md"
                              />
                              <motion.span
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                  className="h-5 w-5 rounded-full border-2 border-black/80 border-t-transparent"
                              />
                            </motion.span>
                        ) : (
                            <motion.span
                                key="idle"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 flex items-center justify-center"
                            >
                              Send til printer
                            </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>
  );
}
