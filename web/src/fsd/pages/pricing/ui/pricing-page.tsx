import Link from "next/link";
import { DemoForm } from "@/features/demo/ui/demo-form";
import { PAGE_DOCS, SOURCE_HREF, SOURCE_LABEL } from "@/fsd/pages/home/overview";
import {
  PREMIUM_LEDE,
  PREMIUM_NAME,
  PREMIUM_POINTS,
  PREMIUM_PRICE,
  PRICING_ASK,
  PRICING_INTEREST,
  PRICING_KICKER,
  PRICING_LEDE,
  PRICING_TITLE,
  SELF_LEDE,
  SELF_NAME,
  SELF_POINTS,
  SELF_PRICE,
} from "@/fsd/pages/pricing/copy";
import { LABEL_DEMO, LABEL_FUTURE, PATH_DOCS, PATH_FUTURE } from "@/fsd/pages/site/nav";
import { SiteFrame } from "@/fsd/pages/site/frame";
import { PAGE_AFTER, PAGE_CARD, PAGE_H2, PAGE_KICKER, PAGE_LEDE, PAGE_MAIN, PAGE_MARK, PAGE_SECTION, PAGE_TITLE } from "@/fsd/pages/site/space";
import { marketingHref } from "@/shared/lib/hosts";

function Points({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-6 grid gap-3">
      {items.map((item) => (
        <li key={item} className="border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PricingPage({ host }: { host: string }) {
  return (
    <SiteFrame host={host}>
      <main className={PAGE_MAIN}>
        <p className={PAGE_KICKER}>{PRICING_KICKER}</p>
        <h1 className={PAGE_TITLE}>{PRICING_TITLE}</h1>
        <p className={PAGE_LEDE}>{PRICING_LEDE}</p>
        <div className={`${PAGE_AFTER} grid gap-4 lg:grid-cols-2`}>
          <section className={`${PAGE_CARD} rise`}>
            <p className={PAGE_MARK}>{SELF_PRICE}</p>
            <h2 className={`mt-3 ${PAGE_H2}`}>{SELF_NAME}</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{SELF_LEDE}</p>
            <Points items={SELF_POINTS} />
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href={SOURCE_HREF} className="border-b border-border">
                {SOURCE_LABEL}
              </Link>
              <Link href={marketingHref(host, PATH_DOCS)} className="border-b border-border">
                {PAGE_DOCS}
              </Link>
            </p>
          </section>
          <section className="rise border border-primary/50 bg-card p-6" style={{ animationDelay: "80ms" }}>
            <p className={PAGE_MARK}>{PREMIUM_PRICE}</p>
            <h2 className={`mt-3 ${PAGE_H2}`}>{PREMIUM_NAME}</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{PREMIUM_LEDE}</p>
            <Points items={PREMIUM_POINTS} />
            <p className="mt-6">
              <Link href={marketingHref(host, PATH_FUTURE)} className="border-b border-border text-sm">
                {LABEL_FUTURE}
              </Link>
            </p>
          </section>
        </div>
        <section className={`${PAGE_SECTION} grid gap-8 border-t border-border pt-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)]`}>
          <div>
            <h2 className={PAGE_H2}>{LABEL_DEMO}</h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{PRICING_ASK}</p>
          </div>
          <DemoForm interest={PRICING_INTEREST} interestLabel={PREMIUM_NAME} />
        </section>
      </main>
    </SiteFrame>
  );
}
