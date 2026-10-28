import type { Metadata } from "next";
import { headers } from "next/headers";
import { SITE_URL } from "@/fsd/pages/home/overview";
import { PRICING_DESCRIPTION, PRICING_TITLE } from "@/fsd/pages/pricing/copy";
import { PricingPage } from "@/fsd/pages/pricing/ui/pricing-page";

export const metadata: Metadata = {
  title: PRICING_TITLE,
  description: PRICING_DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
    url: `${SITE_URL}/pricing`,
  },
};

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <PricingPage host={host} />;
}
