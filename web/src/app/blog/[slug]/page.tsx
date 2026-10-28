import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { findPost } from "@/fsd/pages/blog/posts";
import { BlogPost } from "@/fsd/pages/blog/ui/blog-post";
import { SITE_URL } from "@/fsd/pages/home/overview";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.dek,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.dek,
      url: `${SITE_URL}/blog/${slug}`,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();
  const host = (await headers()).get("host") ?? "";
  return <BlogPost host={host} post={post} />;
}
