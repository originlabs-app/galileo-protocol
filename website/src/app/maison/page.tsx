import Link from "next/link";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "La Maison",
  description:
    "Discover Galileo Network, the organization behind the Galileo Protocol open standard. Our mission: protect luxury brand heritage and human craftsmanship.",
};

export default function MaisonPage() {
  return (
    <main className="ocean-background pt-20">
      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6 md:px-8 max-w-4xl">
          <div className="text-center mb-16">
            <p
              className="text-[10px] tracking-[0.4em] uppercase mb-6"
              style={{
                background: "linear-gradient(180deg, #00FFFF 0%, #00FF88 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              La Maison
            </p>
            <h1
              className="text-4xl md:text-6xl font-extralight text-white mb-8"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Galileo Network
            </h1>
            <p className="text-lg md:text-xl text-white/50 font-light max-w-2xl mx-auto leading-relaxed">
              Protecting brand heritage and human craftsmanship through open,
              neutral technology.
            </p>
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Mission */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-8 max-w-3xl">
          <h2
            className="text-2xl md:text-3xl font-extralight text-white mb-8"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Our Mission
          </h2>
          <div className="space-y-6 text-white/60 leading-relaxed">
            <p>
              The luxury industry faces an existential challenge. Counterfeiting
              erodes brand trust, undermines artisans, and deceives consumers.
              Existing solutions are fragmented, proprietary, and controlled by
              single vendors.
            </p>
            <p>
              Galileo Network was founded to change this. We believe that
              product authenticity is a shared infrastructure problem &mdash;
              one that requires an open, neutral standard rather than another
              walled garden.
            </p>
            <p
              className="text-white/80 text-lg font-light italic"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              &ldquo;Prot&eacute;ger le patrimoine des marques et le
              savoir-faire humain.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Story */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-8 max-w-3xl">
          <h2
            className="text-2xl md:text-3xl font-extralight text-white mb-8"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            The Story
          </h2>
          <div className="space-y-6 text-white/60 leading-relaxed">
            <p>
              Galileo Protocol emerged from a simple observation: luxury brands
              share the same enemy &mdash; counterfeiting &mdash; yet each
              fights alone with incompatible tools. The result is a fragmented
              landscape where no single solution has the network effect needed
              to truly protect consumers.
            </p>
            <p>
              We took inspiration from how the internet itself was built:
              through open standards that competing companies could adopt and
              extend. TCP/IP, HTTP, and TLS didn&apos;t belong to any single
              corporation, yet they became the foundation of a trillion-dollar
              economy. Galileo brings that same philosophy to luxury
              authentication.
            </p>
            <p>
              Licensed under Apache 2.0 and governed by a transparent Technical
              Steering Committee, Galileo Protocol is designed so that competing
              brands can collaborate on shared infrastructure without ceding
              control to any single entity.
            </p>
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Vision */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-8 max-w-3xl">
          <h2
            className="text-2xl md:text-3xl font-extralight text-white mb-8"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Our Vision
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Open by Default",
                description:
                  "Every specification, schema, and reference implementation is public. No vendor lock-in, no hidden fees.",
              },
              {
                title: "Neutral Governance",
                description:
                  "A Technical Steering Committee with brand, tech, and community seats ensures no single party controls the standard.",
              },
              {
                title: "Built for Luxury",
                description:
                  "Designed from day one for the unique requirements of heritage brands: provenance, craftsmanship, and trust.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-xl border border-white/5 bg-white/[0.02]"
              >
                <h3 className="text-sm tracking-wide text-cyan-400 mb-3 font-medium">
                  {item.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 md:px-8 max-w-3xl text-center">
          <h2
            className="text-2xl md:text-3xl font-extralight text-white mb-6"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Ready to explore the standard?
          </h2>
          <p className="text-white/50 mb-10 leading-relaxed max-w-xl mx-auto">
            Dive into the technical specifications that power authentic luxury
            authentication, or jump straight to the quick-start guide.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/specifications"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-medium tracking-wide hover:opacity-90 transition-opacity"
            >
              Browse Specifications
            </Link>
            <Link
              href="/docs/quick-start"
              className="inline-flex items-center gap-2 px-8 py-3.5 border border-white/20 text-white font-medium tracking-wide hover:bg-white/5 hover:border-white/30 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
