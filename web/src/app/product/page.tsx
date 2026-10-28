import type { Metadata } from "next";
import { headers } from "next/headers";
import { SITE_URL } from "@/fsd/pages/home/overview";
import { PRODUCT_DESCRIPTION, PRODUCT_TITLE } from "@/fsd/pages/product/copy";
import { ProductPage } from "@/fsd/pages/product/ui/product-page";

export const metadata: Metadata = {
  title: PRODUCT_TITLE,
  description: PRODUCT_DESCRIPTION,
  alternates: { canonical: "/product" },
  openGraph: {
    title: PRODUCT_TITLE,
    description: PRODUCT_DESCRIPTION,
    url: `${SITE_URL}/product`,
  },
};

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <ProductPage host={host} />;
}
