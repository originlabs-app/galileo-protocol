import type { Metadata } from "next";

/** Declare identity at the page, never on an ancestor layout. */
export function pageMetadata(
  path: string,
  metadata: Metadata & { title: string; description: string },
): Metadata {
  return {
    ...metadata,
    alternates: { canonical: path },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: path,
      siteName: "Galileo Protocol",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
    },
  };
}
