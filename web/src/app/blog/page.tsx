import type { Metadata } from "next";
import { headers } from "next/headers";
import { BLOG_DESCRIPTION, BLOG_TITLE } from "@/fsd/pages/blog/copy";
import { BlogIndex } from "@/fsd/pages/blog/ui/blog-index";
import { SITE_URL } from "@/fsd/pages/home/overview";

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
