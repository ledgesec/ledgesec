import Link from "next/link";
import { BLOG_TITLE } from "@/fsd/pages/blog/copy";
import { posts } from "@/fsd/pages/blog/posts";
import { LABEL_BLOG } from "@/fsd/pages/site/nav";
import { SiteFrame } from "@/fsd/pages/site/frame";
import { PAGE_AFTER, PAGE_H3, PAGE_KICKER, PAGE_MAIN, PAGE_TITLE } from "@/fsd/pages/site/space";

export function BlogIndex({ host }: { host: string }) {
  return (
    <SiteFrame host={host}>
      <main className={PAGE_MAIN}>
        <p className={PAGE_KICKER}>{LABEL_BLOG}</p>
        <h1 className={PAGE_TITLE}>{BLOG_TITLE}</h1>
        <div className={`${PAGE_AFTER} divide-y divide-border border-y border-border`}>
          {posts.map((post) => (
            <article key={post.slug} className="py-8">
              <p className={PAGE_KICKER}>{post.date}</p>
              <h2 className={`mt-3 ${PAGE_H3}`}>
                <Link href={`/blog/${post.slug}`} className="border-b border-transparent hover:border-border">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 max-w-3xl text-muted-foreground">{post.dek}</p>
            </article>
          ))}
        </div>
      </main>
    </SiteFrame>
  );
}
