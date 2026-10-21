import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { findPost } from "@/pages/blog/posts";
import { BlogPost } from "@/pages/blog/ui/blog-post";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();
  const host = (await headers()).get("host") ?? "";
  return <BlogPost host={host} post={post} />;
}
