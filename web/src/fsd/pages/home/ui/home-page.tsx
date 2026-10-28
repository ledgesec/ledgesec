import Image from "next/image";
import Link from "next/link";
import { EXAMPLE_PROBES, EXAMPLE_SITE } from "@/fsd/pages/home/examples";
import {
  FIGURE_ENV,
  FIGURE_REQUESTS,
  PAGE_DOCS,
  PAGE_HISTORY,
  PAGE_HISTORY_LEDE,
  PAGE_HOW,
  PAGE_JSON_LD,
  PAGE_KICKER,
  PAGE_LEDE,
  PAGE_NOTE,
  PAGE_STEPS,
  PAGE_TITLE,
  PAGE_WHEN,
  PAGE_WHEN_ITEMS,
  PAGE_WHO,
  PAGE_WHO_ITEMS,
  SHOT_ENV,
  SHOT_REQUESTS,
  SOURCE_HREF,
  SOURCE_LABEL,
} from "@/fsd/pages/home/overview";
import { ProbeHistory } from "@/fsd/pages/home/ui/probe-history";
import { ABOUT_TITLE } from "@/fsd/pages/about/copy";
import { PRODUCT_TITLE } from "@/fsd/pages/product/copy";
import { LABEL_DEMO, LABEL_PRICING, PATH_ABOUT, PATH_DEMO, PATH_DOCS, PATH_PRICING, PATH_PRODUCT } from "@/fsd/pages/site/nav";
import { PAGE_AFTER, PAGE_CARD, PAGE_CTA, PAGE_H2, PAGE_H3, PAGE_HERO, PAGE_KICKER as KICKER, PAGE_LEDE as LEDE, PAGE_MAIN, PAGE_MARK, PAGE_SECTION } from "@/fsd/pages/site/space";
import { SiteFrame } from "@/fsd/pages/site/frame";
import { JournalFlow } from "@/fsd/pages/site/ui/journal-flow";
import { COLUMN_METHOD, COLUMN_STATUS, COLUMN_USER_AGENT } from "@/shared/lib/columns";
import { marketingHref } from "@/shared/lib/hosts";
import { FIELD_COUNTRY, FIELD_PATH } from "@/widgets/table-tools/query";

const sample = EXAMPLE_PROBES[0];

export function HomePage({ host }: { host: string }) {
  return (
    <SiteFrame host={host}>
      <main className={PAGE_MAIN}>
        <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div>
            <p className={KICKER}>{PAGE_KICKER}</p>
            <h1 className={PAGE_HERO}>{PAGE_TITLE}</h1>
            <p className={LEDE}>{PAGE_LEDE}</p>
            <p className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={marketingHref(host, PATH_DEMO)} className={PAGE_CTA}>
                {LABEL_DEMO}
              </Link>
              <Link href={marketingHref(host, PATH_PRODUCT)} className="inline-flex items-center border border-border px-4 py-3 text-sm">
                {PRODUCT_TITLE}
              </Link>
            </p>
          </div>
          <aside className="border border-border bg-card p-6">
            <p className={PAGE_MARK}>{EXAMPLE_SITE}</p>
            <dl className="mt-5 grid grid-cols-[7.5rem_1fr] gap-y-3 font-mono text-xs">
              <dt className="text-muted-foreground">{COLUMN_METHOD}</dt>
              <dd>{sample.method}</dd>
              <dt className="text-muted-foreground">{FIELD_PATH}</dt>
              <dd>{sample.path}</dd>
              <dt className="text-muted-foreground">{COLUMN_STATUS}</dt>
              <dd>{sample.status}</dd>
              <dt className="text-muted-foreground">{FIELD_COUNTRY}</dt>
              <dd>{sample.country}</dd>
              <dt className="text-muted-foreground">{COLUMN_USER_AGENT}</dt>
              <dd className="break-all">{sample.ua}</dd>
            </dl>
            <p className="mt-5 border-t border-border pt-4 text-sm">The request was not changed.</p>
          </aside>
        </section>
        <JournalFlow />
        <section className={`${PAGE_SECTION} grid gap-10 lg:grid-cols-2`}>
          <div>
            <h2 className={PAGE_H2}>{PAGE_WHO}</h2>
            <ul className="mt-6 grid gap-4">
              {PAGE_WHO_ITEMS.map((item) => (
                <li key={item.title} className={PAGE_CARD}>
                  <h3 className={PAGE_H3}>{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={PAGE_H2}>{PAGE_WHEN}</h2>
            <ul className="mt-6 grid gap-4">
              {PAGE_WHEN_ITEMS.map((item) => (
                <li key={item.title} className={PAGE_CARD}>
                  <h3 className={PAGE_H3}>{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <h2 className={`${PAGE_SECTION} ${PAGE_H2} rise`}>{PAGE_HOW}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {PAGE_STEPS.map((step, index) => (
            <li key={step.title} className={`${PAGE_CARD} rise`} style={{ animationDelay: `${index * 90}ms` }}>
              <p className={PAGE_MARK}>0{index + 1}</p>
              <h3 className={`mt-3 ${PAGE_H3}`}>{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
        <h2 className={`${PAGE_SECTION} ${PAGE_H2}`}>{PAGE_HISTORY}</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">{PAGE_HISTORY_LEDE}</p>
        <div className={`${PAGE_AFTER} border border-border bg-card/50 p-6`}>
          <p className="mb-3 font-mono text-xs text-muted-foreground">{EXAMPLE_SITE}</p>
          <ProbeHistory />
        </div>
        <div className={`${PAGE_AFTER} grid gap-10`}>
          <figure>
            <Image src={SHOT_REQUESTS} alt={FIGURE_REQUESTS} width={1852} height={438} className="h-auto w-full border border-border" />
            <figcaption className="mt-2 text-sm text-muted-foreground">{FIGURE_REQUESTS}</figcaption>
          </figure>
          <figure>
            <Image src={SHOT_ENV} alt={FIGURE_ENV} width={1852} height={296} className="h-auto w-full border border-border" />
            <figcaption className="mt-2 text-sm text-muted-foreground">{FIGURE_ENV}</figcaption>
          </figure>
        </div>
        <p className={`${PAGE_SECTION} flex flex-wrap gap-x-6 gap-y-3`}>
          <Link href={marketingHref(host, PATH_PRICING)} className="border-b border-border">
            {LABEL_PRICING}
          </Link>
          <Link href={marketingHref(host, PATH_DOCS)} className="border-b border-border">
            {PAGE_DOCS}
          </Link>
          <Link href={marketingHref(host, PATH_ABOUT)} className="border-b border-border">
            {ABOUT_TITLE}
          </Link>
          <Link href="/blog/observe-first" className="border-b border-border">
            {PAGE_NOTE}
          </Link>
          <Link href={SOURCE_HREF} className="border-b border-border">
            {SOURCE_LABEL}
          </Link>
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_JSON_LD) }} />
    </SiteFrame>
  );
}
