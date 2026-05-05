import Home from "../../../../page";

export default async function DeepLinkPage({
  params,
}: {
  params: Promise<{ gtin: string; serial: string }>;
}) {
  const { gtin, serial } = await params;

  return Home({
    searchParams: Promise.resolve({
      link: `/01/${gtin}/21/${encodeURIComponent(serial)}`,
    }),
  });
}
