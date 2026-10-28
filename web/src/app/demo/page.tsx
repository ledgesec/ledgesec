import type { Metadata } from "next";
import { headers } from "next/headers";
import { DEMO_DESCRIPTION, DEMO_TITLE } from "@/fsd/pages/demo/copy";
import { DemoPage } from "@/fsd/pages/demo/ui/demo-page";
import { SITE_URL } from "@/fsd/pages/home/overview";

export const metadata: Metadata = {
  title: DEMO_TITLE,
  description: DEMO_DESCRIPTION,
  alternates: { canonical: "/demo" },
  openGraph: {
    title: DEMO_TITLE,
    description: DEMO_DESCRIPTION,
    url: `${SITE_URL}/demo`,
  },
};

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <DemoPage host={host} />;
}
