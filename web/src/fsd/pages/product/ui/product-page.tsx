import Link from "next/link";
import { PAGE_DOCS } from "@/fsd/pages/home/overview";
import { PRODUCT_KICKER, PRODUCT_LEDE, PRODUCT_SECTIONS, PRODUCT_TITLE } from "@/fsd/pages/product/copy";
import { LABEL_DEMO, LABEL_PRICING, PATH_DEMO, PATH_DOCS, PATH_PRICING } from "@/fsd/pages/site/nav";
import { SiteFrame } from "@/fsd/pages/site/frame";
import { PAGE_AFTER, PAGE_CTA, PAGE_H3, PAGE_KICKER, PAGE_LEDE, PAGE_MAIN, PAGE_MARK, PAGE_SECTION, PAGE_TITLE } from "@/fsd/pages/site/space";
import { DIAGRAM_PRODUCT } from "@/fsd/pages/site/diagrams";
import { SiteDiagram } from "@/fsd/pages/site/ui/site-diagram";
import { marketingHref } from "@/shared/lib/hosts";

export function ProductPage({ host }: { host: string }) {
  return (
    <SiteFrame host={host}>
      <main className={PAGE_MAIN}>
        <p className={PAGE_KICKER}>{PRODUCT_KICKER}</p>
        <h1 className={PAGE_TITLE}>{PRODUCT_TITLE}</h1>
        <p className={PAGE_LEDE}>{PRODUCT_LEDE}</p>
        <SiteDiagram name={DIAGRAM_PRODUCT} />
        <div className={`${PAGE_AFTER} grid gap-4`}>
          {PRODUCT_SECTIONS.map((section, index) => (
            <section key={section.title} className="grid gap-x-6 gap-y-3 border border-border bg-card/70 p-6 md:grid-cols-[4rem_1fr] md:items-start">
              <p className={PAGE_MARK}>0{index + 1}</p>
              <div>
                <h2 className={PAGE_H3}>{section.title}</h2>
                <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{section.body}</p>
              </div>
            </section>
          ))}
        </div>
        <p className={`${PAGE_SECTION} flex flex-wrap items-center gap-x-6 gap-y-3`}>
          <Link href={marketingHref(host, PATH_DEMO)} className={PAGE_CTA}>
            {LABEL_DEMO}
          </Link>
          <Link href={marketingHref(host, PATH_PRICING)} className="border-b border-border text-sm">
            {LABEL_PRICING}
          </Link>
          <Link href={marketingHref(host, PATH_DOCS)} className="border-b border-border text-sm">
            {PAGE_DOCS}
          </Link>
        </p>
      </main>
    </SiteFrame>
  );
}
