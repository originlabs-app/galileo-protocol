import { getAllPosts, formatDate } from "@/lib/blog";
import Link from "next/link";
import { Calendar, User } from "lucide-react";

export const metadata = {
  title: "Blog",
  description:
    "Latest news, announcements, and updates from the Galileo Protocol project. Stay informed about luxury authentication standards, releases, and ecosystem developments.",
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="ocean-background min-h-screen">
      <main className="container pt-40 pb-16 md:pb-24">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-4 mb-6">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-cyan-500/50" />
            <span className="text-[10px] tracking-[0.4em] uppercase text-cyan-400/60">
              Latest
            </span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>
          <h1 className="bg-gradient-to-r from-[var(--cyan-primary)] to-[var(--emerald-primary)] bg-clip-text text-transparent mb-4">
            Blog
          </h1>
          <p className="text-xl text-[var(--platinum-dim)] max-w-2xl mx-auto">
            News, announcements, and updates from the Galileo Luxury Standard
            ecosystem.
          </p>
        </header>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div className="glass-card p-12 text-center max-w-xl mx-auto">
            <p className="text-[var(--platinum-dim)] text-lg">
              No blog posts yet. Check back soon for updates!
            </p>
          </div>
        ) : (
          <div className={`grid gap-8 ${
            posts.length === 1
              ? 'max-w-md mx-auto'
              : posts.length === 2
              ? 'md:grid-cols-2 max-w-3xl mx-auto'
              : 'md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {posts.map((post, index) => {
              // Generate unique gradient angles per card for visual variety
              const hueShift = index * 40;
              const angle = 135 + index * 15;

              return (
                <article key={post.slug} className="group relative">
                  <Link href={`/blog/${post.slug}`} className="block h-full">
                    <div
                      className="relative h-full overflow-hidden border border-white/[0.06] transition-all duration-500 hover:border-cyan-400/20"
                      style={{
                        background:
                          "linear-gradient(145deg, var(--slate) 0%, var(--graphite) 50%, var(--obsidian) 100%)",
                        borderRadius: "16px",
                        boxShadow:
                          "0 1px 2px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)",
                      }}
                    >
                      {/* Image placeholder / Cover */}
                      <div
                        className="relative h-44 overflow-hidden"
                        style={{
                          background: post.frontmatter.coverImage
                            ? `url(${post.frontmatter.coverImage}) center/cover`
                            : `linear-gradient(${angle}deg, var(--ocean-bathypelagic) 0%, var(--ocean-mesopelagic) 40%, var(--ocean-epipelagic) 100%)`,
                        }}
                      >
                        {/* Abstract pattern overlay */}
                        {!post.frontmatter.coverImage && (
                          <>
                            <div
                              className="absolute inset-0 opacity-30"
                              style={{
                                backgroundImage: `radial-gradient(ellipse at ${30 + (hueShift % 60)}% ${20 + (hueShift % 40)}%, rgba(0,255,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at ${70 - (hueShift % 30)}% ${60 + (hueShift % 30)}%, rgba(0,255,136,0.1) 0%, transparent 50%)`,
                              }}
                            />
                            {/* Subtle grid pattern */}
                            <div
                              className="absolute inset-0 opacity-[0.04]"
                              style={{
                                backgroundImage:
                                  "linear-gradient(rgba(0,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.5) 1px, transparent 1px)",
                                backgroundSize: "40px 40px",
                              }}
                            />
                          </>
                        )}
                        {/* Bottom fade to card body */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--graphite)] to-transparent" />

                        {/* Tags overlaid on image */}
                        {post.frontmatter.tags.length > 0 && (
                          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            {post.frontmatter.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full border border-white/20 text-white/80 bg-black/30 backdrop-blur-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Hover glow overlay */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[16px]"
                        style={{
                          boxShadow:
                            "inset 0 0 60px rgba(0,255,255,0.04), 0 0 40px rgba(0,255,255,0.03)",
                        }}
                      />

                      {/* Card body */}
                      <div className="relative px-6 pb-6 pt-2 flex flex-col flex-1">
                        {/* Title */}
                        <h2
                          className="!text-lg font-light text-[var(--platinum)] mb-2 group-hover:text-[var(--cyan-primary)] transition-colors duration-500 !leading-snug line-clamp-3"
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          {post.frontmatter.title}
                        </h2>

                        {/* Excerpt */}
                        <p className="text-[var(--platinum-dim)] text-sm leading-relaxed line-clamp-2 flex-1 mb-4">
                          {post.frontmatter.excerpt}
                        </p>

                        {/* Separator */}
                        <div
                          className="mb-4 h-[1px]"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(0,255,255,0.15), rgba(0,255,136,0.08), transparent)",
                          }}
                        />

                        {/* Meta + Read more */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(post.frontmatter.date)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {post.frontmatter.author}
                            </span>
                          </div>
                          <span className="text-[11px] tracking-wide text-white/30 group-hover:text-cyan-400/80 transition-colors duration-500 flex items-center gap-1.5">
                            Read
                            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                              &rarr;
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Bottom accent line that expands on hover */}
                      <div
                        className="absolute bottom-0 left-0 h-[1px] w-1/4 group-hover:w-full transition-all duration-700"
                        style={{
                          background:
                            "linear-gradient(90deg, var(--cyan-primary), var(--emerald-primary), transparent)",
                          opacity: 0.4,
                        }}
                      />
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {/* Subscribe CTA */}
        <section className="mt-24 text-center">
          <div className="glass-card p-8 md:p-12 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-[var(--platinum)] mb-4">
              Stay Updated
            </h2>
            <p className="text-[var(--platinum-dim)] mb-6">
              Follow the project on GitHub to receive updates about new
              releases, features, and ecosystem developments.
            </p>
            <a
              href="https://github.com/originlabs-app/galileo-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-abysse rounded-lg inline-flex items-center gap-2 button-haptic"
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Watch on GitHub
              </span>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
