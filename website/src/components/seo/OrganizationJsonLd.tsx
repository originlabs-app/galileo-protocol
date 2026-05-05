import { JsonLd } from "./JsonLd";

const organizationData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.galileoprotocol.io/#organization",
      name: "Galileo Network",
      alternateName: "Galileo Protocol",
      url: "https://www.galileoprotocol.io",
      logo: "https://www.galileoprotocol.io/favicon.svg",
      sameAs: ["https://github.com/originlabs-app/galileo-protocol"],
    },
    {
      "@type": "WebSite",
      "@id": "https://www.galileoprotocol.io/#website",
      name: "Galileo Protocol",
      url: "https://www.galileoprotocol.io",
      publisher: {
        "@id": "https://www.galileoprotocol.io/#organization",
      },
    },
  ],
};

export function OrganizationJsonLd() {
  return <JsonLd data={organizationData} />;
}
