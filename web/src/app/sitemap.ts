import type { MetadataRoute } from "next";
import { posts } from "@/fsd/pages/blog/posts";
import { FUTURE_PATH, PAINS } from "@/fsd/pages/future/pains";
import { SITE_URL } from "@/fsd/pages/home/overview";
import { HUMANS_PATH, LLMS_FULL_PATH, LLMS_PATH } from "@/shared/lib/crawl-paths";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/product`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/demo`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}${FUTURE_PATH}`, changeFrequency: "monthly", priority: 0.7 },
    ...PAINS.map((pain) => ({
      url: `${SITE_URL}${FUTURE_PATH}/${pain.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    { url: `${SITE_URL}/docs`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "monthly", priority: 0.6 },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
    { url: `${SITE_URL}${LLMS_PATH}`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}${LLMS_FULL_PATH}`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}${HUMANS_PATH}`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
