import Link from "next/link";
import { posts } from "@/pages/blog/posts";
import { SiteHeader } from "@/widgets/site-header/ui/site-header";

export function BlogIndex({ host }: { host: string }) {
  return (
    <>
      <SiteHeader host={host} />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pt-16 pb-20">
        <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">Blog</p>
        <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight">Notes from the edge.</h1>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {posts.map((post) => (
            <article key={post.slug} className="py-6">
              <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">{post.date}</p>
              <h2 className="mt-2 font-serif text-2xl font-medium">
                <Link href={`/blog/${post.slug}`} className="border-b border-transparent hover:border-border">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-muted-foreground">{post.dek}</p>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
