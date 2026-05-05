import Link from "next/link";

export const metadata = {
  title: "Lost in the Abyss",
};

export default function NotFound() {
  return (
    <div className="ocean-background min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        {/* Depth indicator */}
        <div className="inline-flex items-center gap-4 mb-12">
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-cyan-500/30" />
          <span className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/50">
            404 &middot; Page Not Found
          </span>
          <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-cyan-500/30" />
        </div>

        {/* Title */}
        <h1
          className="text-5xl md:text-7xl font-extralight text-white mb-6"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Lost in the Abyss
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/40 font-light leading-relaxed mb-12">
          This page has sunk beyond reach. The depths hold many secrets, but
          this path leads nowhere.
        </p>

        {/* Navigation links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 border border-cyan-400/30 text-cyan-400 text-sm tracking-wider uppercase hover:bg-cyan-400/10 transition-colors duration-300 rounded-sm"
          >
            Return to Surface
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-8 py-3 text-white/40 text-sm tracking-wider uppercase hover:text-white/60 transition-colors duration-300"
          >
            Explore Documentation
          </Link>
        </div>

        {/* Decorative sonar ring */}
        <div className="mt-16 flex justify-center">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-20">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#00FFFF"
                strokeWidth="0.5"
              />
              <circle
                cx="50"
                cy="50"
                r="30"
                fill="none"
                stroke="#00FFFF"
                strokeWidth="0.5"
              />
              <circle
                cx="50"
                cy="50"
                r="15"
                fill="none"
                stroke="#00FFFF"
                strokeWidth="0.5"
              />
              <circle cx="50" cy="50" r="2" fill="#00FFFF" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
