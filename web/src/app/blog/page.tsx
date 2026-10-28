import type { Metadata } from "next";
import { headers } from "next/headers";
import { BlogIndex } from "@/fsd/pages/blog/ui/blog-index";
import { SITE_URL } from "@/fsd/pages/home/overview";

const BLOG_TITLE = "Notes on the journal";
const BLOG_DESCRIPTION = "How the collector reads the access log, and how a probe path keeps the country and User-Agent.";

export const metadata: Metadata = {
  title: BLOG_TITLE,
  description: BLOG_DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    url: `${SITE_URL}/blog`,
  },
};

export default async function Page() {
  const host = (await headers()).get("host") ?? "";
  return <BlogIndex host={host} />;
}
