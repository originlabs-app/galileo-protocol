import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for galileoprotocol.io. Learn how the Galileo Protocol website handles your data with minimal collection, no tracking cookies, and full transparency.",
};

export default function PrivacyPage() {
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
            Privacy Policy
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
            <h2>Overview</h2>
            <p>
              Galileo Protocol is an open-source project licensed under Apache
              2.0. This website (galileoprotocol.io) serves as the documentation
              and community hub for the protocol. This website is published by
              Galileo Network EURL, registered in Bordeaux, France (SIREN: 919
              409 862). We are committed to keeping data collection minimal and
              transparent.
            </p>

            <h2>Information We Collect</h2>
            <h3>Analytics</h3>
            <p>
              We may collect anonymized usage data to understand how visitors
              interact with our documentation. This includes page views,
              approximate geographic region, and browser type. No personally
              identifiable information is collected through analytics.
            </p>

            <h3>Server Logs</h3>
            <p>
              Our hosting provider may automatically collect standard server
              logs, including IP addresses and request timestamps. These logs
              are used solely for security monitoring and are retained for no
              more than 30 days.
            </p>

            <h2>Cookies</h2>
            <p>
              This website does not use tracking cookies or third-party
              advertising cookies. Essential cookies may be used for basic site
              functionality such as remembering your preferences (e.g., theme or
              language settings).
            </p>

            <h2>Third-Party Services</h2>
            <p>
              Our source code is hosted on GitHub. When you interact with our
              GitHub repository, GitHub&apos;s own privacy policy applies. We do
              not embed third-party trackers, social media widgets, or
              advertising networks on this website.
            </p>

            <h2>Data Sharing</h2>
            <p>
              We do not sell, rent, or share any visitor data with third
              parties. Anonymized, aggregated analytics may be referenced in
              public reports about protocol adoption.
            </p>

            <h2>Open Source Contributions</h2>
            <p>
              If you contribute to the Galileo Protocol through GitHub, your
              contributions (including your GitHub username and commit history)
              are publicly visible as part of the open-source project. This is
              standard practice for Apache 2.0 licensed projects.
            </p>

            <h2>Your Rights</h2>
            <p>
              Since we collect minimal data, there is very little personal
              information to manage. If you have questions about any data we may
              hold, please open an issue on our GitHub repository or contact us
              through GitHub Discussions.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              We may update this privacy policy as the project evolves. Changes
              will be reflected on this page with an updated date. For
              significant changes, we will post a notice in our GitHub
              repository.
            </p>

            <h2>Contact</h2>
            <p>
              For privacy-related inquiries, please reach out through{" "}
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
