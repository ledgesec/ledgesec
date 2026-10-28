import type { Metadata } from "next";
import { headers } from "next/headers";
import { DOCS_LEDE, DOCS_TITLE } from "@/fsd/pages/docs/connect";
import { DocsPage } from "@/fsd/pages/docs/ui/docs-page";
import { SITE_URL } from "@/fsd/pages/home/overview";

export const metadata: Metadata = {
  title: DOCS_TITLE,
  description: DOCS_LEDE,
  alternates: { canonical: "/docs" },
  openGraph: {
    title: DOCS_TITLE,
    description: DOCS_LEDE,
    url: `${SITE_URL}/docs`,
  },
};

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <DocsPage host={host} />;
}
