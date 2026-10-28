import type { Metadata } from "next";
import { headers } from "next/headers";
import { ABOUT_DESCRIPTION, ABOUT_TITLE } from "@/fsd/pages/about/copy";
import { AboutPage } from "@/fsd/pages/about/ui/about-page";
import { SITE_URL } from "@/fsd/pages/home/overview";

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: ABOUT_TITLE,
    description: ABOUT_DESCRIPTION,
    url: `${SITE_URL}/about`,
  },
};

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <AboutPage host={host} />;
}
