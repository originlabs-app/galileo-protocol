import type { Metadata } from "next";

type PageMetadata = Metadata & {
  title: string;
  description: string;
  alternates: { canonical: string };
};

export function withPageMetadata(metadata: PageMetadata): Metadata {
  const title = `${metadata.title} | Galileo Protocol`;
  return {
    ...metadata,
    openGraph: {
      siteName: "Galileo Protocol",
      locale: "en_US",
      type: "website",
      ...metadata.openGraph,
      title,
      description: metadata.description,
      url: metadata.alternates.canonical,
    },
    twitter: {
      card: "summary_large_image",
      ...metadata.twitter,
      title,
      description: metadata.description,
    },
  };
}
