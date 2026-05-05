import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Legal Notice",
  description:
    "Legal notice (mentions legales) for galileoprotocol.io. Published by Galileo Network EURL, Bordeaux, France. Hosting, intellectual property, and contact information.",
};

export default function LegalPage() {
  return (
    <main className="ocean-background pt-20">
      {/* Header */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6 md:px-8 max-w-3xl">
          <p
            className="text-[10px] tracking-[0.4em] uppercase mb-6"
            style={{
              background: "linear-gradient(180deg, #00FFFF 0%, #00FF88 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Legal
          </p>
          <h1
            className="text-4xl md:text-5xl font-extralight text-white mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Legal Notice
          </h1>
          <p className="text-sm text-white/40">Last updated: March 2026</p>
        </div>
      </section>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-8 max-w-3xl">
          <div className="prose">
            <h2>Publisher</h2>
            <p>
              This website is published by <strong>Galileo Network EURL</strong>
              , operating under the trade name <strong>Galileo Protocol</strong>
              .
            </p>
            <ul>
              <li>
                Legal form: EURL (Entreprise Unipersonnelle &agrave;
                Responsabilit&eacute; Limit&eacute;e)
              </li>
              <li>Share capital: &euro;1,000</li>
              <li>Activity: Application software publishing</li>
            </ul>

            <h2>Registered Office</h2>
            <p>9 rue de Cond&eacute;, 33000 Bordeaux, France</p>

            <h2>Registration</h2>
            <p>
              SIREN: 919 409 862
              <br />
              Registered with the Registre du Commerce et des
              Soci&eacute;t&eacute;s (RCS) de Bordeaux.
            </p>

            <h2>Manager</h2>
            <p>
              Pierre Beunardeau, in his capacity as manager (g&eacute;rant) of
              Galileo Network EURL.
            </p>

            <h2>Hosting Provider</h2>
            <p>
              This website is hosted by{" "}
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Vercel Inc.
              </a>
            </p>
            <ul>
              <li>Address: 440 N Barranca Ave #4133, Covina, CA 91723, USA</li>
              <li>Website: vercel.com</li>
            </ul>

            <h2>Intellectual Property</h2>
            <p>
              The Galileo Protocol specifications, documentation, and reference
              implementations are licensed under the{" "}
              <a
                href="https://github.com/originlabs-app/galileo-protocol/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
              >
                Apache License 2.0
              </a>
              . You are free to use, modify, and distribute the protocol in
              accordance with the terms of that license.
            </p>
            <p>
              &ldquo;Galileo Protocol&rdquo; is a trademark of Galileo Network
              EURL. The Apache 2.0 license does not grant permission to use
              project trademarks.
            </p>

            <h2>Contact</h2>
            <p>
              For any inquiries, please reach out through{" "}
              <a
                href="https://github.com/originlabs-app/galileo-protocol/discussions"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Discussions
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
