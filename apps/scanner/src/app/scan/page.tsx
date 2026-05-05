"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ScanState = "loading" | "scanning" | "error";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handleResultRef = useRef<(rawValue: string) => void>(undefined);
  const [state, setState] = useState<ScanState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleResult = useCallback(
    (rawValue: string) => {
      stopCamera();
      router.push(`/?link=${encodeURIComponent(rawValue)}`);
    },
    [router, stopCamera],
  );

  // Keep ref in sync so the effect closure always calls the latest version
  handleResultRef.current = handleResult;

  const handleClose = useCallback(() => {
    stopCamera();
    router.push("/");
  }, [router, stopCamera]);

  useEffect(() => {
    let cancelled = false;
    let animationId: number;

    async function init() {
      const { BarcodeDetector } = await import("barcode-detector/ponyfill");
      const detector = new BarcodeDetector({ formats: ["qr_code"] });

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
          },
          audio: false,
        });
      } catch (camErr) {
        if (!cancelled) {
          const isPermissionDenied =
            camErr instanceof DOMException &&
            (camErr.name === "NotAllowedError" ||
              camErr.name === "PermissionDeniedError");
          setError(
            isPermissionDenied
              ? "Camera access blocked"
              : "Camera unavailable. Check that no other app is using it, then retry.",
          );
          setCameraBlocked(isPermissionDenied);
          setState("error");
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();
      setState("scanning");

      function detect() {
        if (cancelled) return;

        if (!videoRef.current || videoRef.current.readyState < 2) {
          animationId = requestAnimationFrame(detect);
          return;
        }

        detector
          .detect(videoRef.current)
          .then((barcodes) => {
            if (cancelled) return;
            if (barcodes.length > 0 && barcodes[0]!.rawValue) {
              handleResultRef.current?.(barcodes[0]!.rawValue);
              return;
            }
            animationId = requestAnimationFrame(detect);
          })
          .catch(() => {
            if (!cancelled) animationId = requestAnimationFrame(detect);
          });
      }

      detect();
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
      />

      {/* Viewfinder overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {/* Dim surrounding area */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Transparent scanning window */}
        <div className="relative z-10 h-64 w-64 sm:h-72 sm:w-72">
          <div className="absolute inset-0 rounded-3xl ring-2 ring-primary/60" />
          {/* Corner accents */}
          <svg
            className="absolute inset-0 h-full w-full text-primary"
            viewBox="0 0 256 256"
            fill="none"
            aria-hidden="true"
          >
            {/* Top-left */}
            <path
              d="M8 40V16a8 8 0 0 1 8-8h24"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Top-right */}
            <path
              d="M216 8h24a8 8 0 0 1 8 8v24"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Bottom-right */}
            <path
              d="M248 216v24a8 8 0 0 1-8 8h-24"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Bottom-left */}
            <path
              d="M40 248H16a8 8 0 0 1-8-8v-24"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>

          {/* Scanning line animation */}
          {state === "scanning" ? (
            <div className="absolute inset-x-4 top-1/2 h-px animate-pulse bg-primary/80 shadow-[0_0_8px_rgba(0,255,255,0.5)]" />
          ) : null}
        </div>
      </div>

      {/* Status bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-6 pb-10 pt-16">
        <p className="text-center text-sm text-white/80">
          {state === "loading" && "Starting camera\u2026"}
          {state === "scanning" && "Point at a Galileo QR code"}
          {state === "error" && error}
        </p>

        {state === "error" && cameraBlocked && (
          <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/70">
            <p className="mb-1 font-semibold text-white/90">
              How to re-enable camera access:
            </p>
            <ul className="space-y-1 pl-3">
              <li>
                <span className="font-medium text-white/80">iOS Safari:</span>{" "}
                Settings &rsaquo; Safari &rsaquo; Camera &rsaquo; Allow
              </li>
              <li>
                <span className="font-medium text-white/80">Android Chrome:</span>{" "}
                tap the lock icon in the address bar &rsaquo; Camera &rsaquo; Allow
              </li>
              <li>
                <span className="font-medium text-white/80">Desktop:</span>{" "}
                click the camera icon in the address bar and allow access
              </li>
            </ul>
          </div>
        )}

        {state === "error" ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-medium text-white"
            >
              Go back
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Top bar with title */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-5 pb-10 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-black/40 text-primary">
          <svg
            width="20"
            height="20"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle
              cx="20"
              cy="20"
              r="8"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="20" cy="20" r="3" fill="currentColor" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-primary/80">
            Scanner
          </p>
          <h1 className="font-serif text-xl font-semibold text-white">
            Galileo Verify
          </h1>
        </div>
      </div>
    </main>
  );
}
