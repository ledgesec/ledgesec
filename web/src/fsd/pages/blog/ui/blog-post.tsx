import Link from "next/link";
import type { Post } from "@/fsd/pages/blog/posts";
import { SiteHeader } from "@/widgets/site-header/ui/site-header";

export function BlogPost({ host, post }: { host: string; post: Post }) {
  return (
    <>
      <SiteHeader host={host} />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pt-16 pb-20">
        <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">{post.date}</p>
        <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight">{post.title}</h1>
        <div className="mt-6 space-y-4 text-lg leading-relaxed">
          {post.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-10">
          <Link href="/blog" className="border-b border-border">Back to the blog</Link>
        </p>
      </main>
    </>
  );
}
