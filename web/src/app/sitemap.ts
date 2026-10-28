import type { MetadataRoute } from "next";
import { posts } from "@/fsd/pages/blog/posts";
import { SITE_URL } from "@/fsd/pages/home/overview";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/docs`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "monthly", priority: 0.6 },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];
}
