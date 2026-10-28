import { ABOUT_KICKER, ABOUT_LEDE, ABOUT_SECTIONS, ABOUT_TITLE } from "@/fsd/pages/about/copy";
import { PRODUCT_TITLE } from "@/fsd/pages/product/copy";
import { LABEL_DEMO, PATH_DEMO, PATH_PRODUCT } from "@/fsd/pages/site/nav";
import { SiteFrame } from "@/fsd/pages/site/frame";
import { PAGE_AFTER, PAGE_CARD, PAGE_CTA, PAGE_H3, PAGE_KICKER, PAGE_LEDE, PAGE_MAIN, PAGE_SECTION, PAGE_TITLE } from "@/fsd/pages/site/space";
import { marketingHref } from "@/shared/lib/hosts";
import Link from "next/link";

export function AboutPage({ host }: { host: string }) {
  return (
    <SiteFrame host={host}>
      <main className={PAGE_MAIN}>
        <p className={PAGE_KICKER}>{ABOUT_KICKER}</p>
        <h1 className={PAGE_TITLE}>{ABOUT_TITLE}</h1>
        <p className={PAGE_LEDE}>{ABOUT_LEDE}</p>
        <div className={`${PAGE_AFTER} grid gap-4 md:grid-cols-2`}>
          {ABOUT_SECTIONS.map((section) => (
            <section key={section.title} className={PAGE_CARD}>
              <h2 className={PAGE_H3}>{section.title}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
        <p className={`${PAGE_SECTION} flex flex-wrap items-center gap-x-6 gap-y-3`}>
          <Link href={marketingHref(host, PATH_DEMO)} className={PAGE_CTA}>
            {LABEL_DEMO}
          </Link>
          <Link href={marketingHref(host, PATH_PRODUCT)} className="border-b border-border text-sm">
            {PRODUCT_TITLE}
          </Link>
        </p>
      </main>
    </SiteFrame>
  );
}
