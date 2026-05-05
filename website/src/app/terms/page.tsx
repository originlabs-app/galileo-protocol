import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Terms of Use",
  description:
    "Terms of use for the Galileo Protocol website and documentation. Understand your rights and obligations for this Apache 2.0 licensed open-source standard.",
};

export default function TermsPage() {
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
            Terms of Use
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
            <h2>Acceptance of Terms</h2>
            <p>
              By accessing and using the Galileo Protocol website
              (galileoprotocol.io), you agree to these Terms of Use. If you do
              not agree, please do not use this website.
            </p>

            <h2>Open Source License</h2>
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

            <h2>Content</h2>
            <p>
              All documentation, specifications, and educational content on this
              website is provided &ldquo;as is&rdquo; without warranty of any
              kind, express or implied. While we strive for accuracy, we make no
              guarantees that the content is complete, current, or free of
              errors.
            </p>

            <h2>No Warranty</h2>
            <p>
              Consistent with the Apache 2.0 license, the Galileo Protocol and
              all associated materials are provided without warranty.
              Specifically:
            </p>
            <ul>
              <li>
                We make no warranties regarding the suitability of the protocol
                for any particular purpose.
              </li>
              <li>
                We do not guarantee uninterrupted or error-free operation of
                this website.
              </li>
              <li>
                Implementation of the protocol is at your own risk and
                responsibility.
              </li>
            </ul>

            <h2>Limitation of Liability</h2>
            <p>
              In no event shall Galileo Network, the Galileo Protocol
              contributors, or the Technical Steering Committee be liable for
              any direct, indirect, incidental, special, or consequential
              damages arising from the use of this website, the protocol
              specifications, or any related materials.
            </p>

            <h2>Contributions</h2>
            <p>
              Contributions to the Galileo Protocol are governed by the
              project&apos;s{" "}
              <a
                href="https://github.com/originlabs-app/galileo-protocol/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                Contributing Guidelines
              </a>{" "}
              and the Apache 2.0 license. By submitting a contribution, you
              agree that your work will be licensed under the same terms.
            </p>

            <h2>Trademarks</h2>
            <p>
              &ldquo;Galileo Protocol&rdquo; and the Galileo logo are trademarks
              of Galileo Network. Use of these marks must comply with the
              project&apos;s trademark guidelines. The Apache 2.0 license does
              not grant permission to use project trademarks.
            </p>

            <h2>External Links</h2>
            <p>
              This website may contain links to third-party websites (such as
              GitHub). We are not responsible for the content or privacy
              practices of those sites.
            </p>

            <h2>Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes
              will be posted on this page with an updated date. Continued use of
              the website after changes constitutes acceptance of the revised
              terms.
            </p>

            <h2>Governing Law</h2>
            <p>
              These terms are governed by applicable law. Any disputes arising
              from the use of this website or the protocol shall be resolved
              through the dispute resolution mechanisms described in the
              project&apos;s governance charter.
            </p>

            <h2>Contact</h2>
            <p>
              For questions about these terms, please reach out through{" "}
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
