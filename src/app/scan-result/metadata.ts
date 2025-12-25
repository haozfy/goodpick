import type { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { id?: string };
}): Promise<Metadata> {
  const id = searchParams?.id;
  const base = "https://goodpick.app";

  const ogImage = id
    ? `${base}/api/og/scan?id=${encodeURIComponent(id)}`
    : `${base}/api/og/scan`;

  const url = id ? `${base}/scan-result?id=${encodeURIComponent(id)}` : `${base}/scan-result`;

  return {
    metadataBase: new URL(base),
    title: "GoodPick — Food Scan Result",
    description: "Scan packaged foods and get a clean score + healthier alternatives.",
    openGraph: {
      title: "GoodPick — Food Scan Result",
      description: "Scan packaged foods and get a clean score + healthier alternatives.",
      url,
      siteName: "GoodPick",
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "GoodPick — Food Scan Result",
      description: "Scan packaged foods and get a clean score + healthier alternatives.",
      images: [ogImage],
    },
  };
}