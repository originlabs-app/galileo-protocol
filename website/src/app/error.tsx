"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="ocean-background min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        {/* Depth indicator */}
        <div className="inline-flex items-center gap-4 mb-12">
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-red-500/30" />
          <span className="text-[10px] tracking-[0.4em] uppercase text-red-400/50">
            Error &middot; Something Went Wrong
          </span>
          <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-red-500/30" />
        </div>

        {/* Title */}
        <h1
          className="text-5xl md:text-7xl font-extralight text-white mb-6"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Pressure Breach
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/40 font-light leading-relaxed mb-12">
          Something unexpected happened in the deep. The system encountered an
          error it could not recover from automatically.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-8 py-3 border border-cyan-400/30 text-cyan-400 text-sm tracking-wider uppercase hover:bg-cyan-400/10 transition-colors duration-300 rounded-sm cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 text-white/40 text-sm tracking-wider uppercase hover:text-white/60 transition-colors duration-300"
          >
            Return to Surface
          </Link>
        </div>
      </div>
    </div>
  );
}
