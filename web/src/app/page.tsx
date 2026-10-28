import type { Metadata } from "next";
import { headers } from "next/headers";
import { FIGURE_REQUESTS, SHOT_REQUESTS, SITE_DESCRIPTION, SITE_URL, SOCIAL_TITLE } from "@/fsd/pages/home/overview";
import { HomePage } from "@/fsd/pages/home/ui/home-page";

export const metadata: Metadata = {
  title: { absolute: SOCIAL_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SOCIAL_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: SHOT_REQUESTS, alt: FIGURE_REQUESTS, width: 1852, height: 438 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: SITE_DESCRIPTION,
    images: [SHOT_REQUESTS],
  },
};

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <HomePage host={host} />;
}
