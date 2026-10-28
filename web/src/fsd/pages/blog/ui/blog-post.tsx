import Link from "next/link";
import { BLOG_BACK } from "@/fsd/pages/blog/copy";
import type { Post } from "@/fsd/pages/blog/posts";
import { SiteFrame } from "@/fsd/pages/site/frame";
import { PAGE_KICKER, PAGE_MAIN, PAGE_PROSE, PAGE_SECTION, PAGE_TITLE } from "@/fsd/pages/site/space";

export function BlogPost({ host, post }: { host: string; post: Post }) {
  return (
    <SiteFrame host={host}>
      <main className={PAGE_MAIN}>
        <div className={PAGE_PROSE}>
          <p className={PAGE_KICKER}>{post.date}</p>
          <h1 className={PAGE_TITLE}>{post.title}</h1>
          <div className="mt-6 space-y-6 text-lg leading-relaxed">
            {post.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className={PAGE_SECTION}>
            <Link href="/blog" className="border-b border-border">
              {BLOG_BACK}
            </Link>
          </p>
        </div>
      </main>
    </SiteFrame>
  );
}
