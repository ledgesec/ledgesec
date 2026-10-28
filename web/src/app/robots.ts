import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_URL } from "@/fsd/pages/home/overview";
import { SITEMAP_PATH, robotsDisallow } from "@/shared/lib/crawl-paths";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";
  const disallow = [...robotsDisallow(host)];
  if (disallow.length === 1 && disallow[0] === "/") {
    return { rules: { userAgent: "*", disallow } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow },
    sitemap: `${SITE_URL}${SITEMAP_PATH}`,
    host: SITE_URL,
  };
}
