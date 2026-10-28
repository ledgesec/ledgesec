import Image from "next/image";
import Link from "next/link";
import { EXAMPLE_SITE } from "@/fsd/pages/home/examples";
import {
  FIGURE_ENV,
  FIGURE_REQUESTS,
  PAGE_FOOTER,
  PAGE_HISTORY,
  PAGE_HISTORY_LEDE,
  PAGE_HOW,
  PAGE_JSON_LD,
  PAGE_KICKER,
  PAGE_LEDE,
  PAGE_DOCS,
  PAGE_NOTE,
  PAGE_SOURCE,
  PAGE_STEPS,
  PAGE_TITLE,
  SHOT_ENV,
  SHOT_REQUESTS,
  SOURCE_HREF,
  SOURCE_LABEL,
} from "@/fsd/pages/home/overview";
import { ProbeHistory } from "@/fsd/pages/home/ui/probe-history";
import { SiteHeader } from "@/widgets/site-header/ui/site-header";

export function HomePage({ host }: { host: string }) {
  return (
    <>
      <SiteHeader host={host} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-12 pb-20">
        <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">{PAGE_KICKER}</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight font-medium tracking-tight md:text-5xl">{PAGE_TITLE}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed">{PAGE_LEDE}</p>
        <h2 className="mt-12 font-serif text-2xl font-medium">{PAGE_HOW}</h2>
        <ol className="mt-4 divide-y divide-border border-y border-border">
          {PAGE_STEPS.map((step, index) => (
            <li key={step.title} className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr]">
              <p>
                {index + 1}. {step.title}
              </p>
              <p className="text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
        <h2 className="mt-12 font-serif text-2xl font-medium">{PAGE_HISTORY}</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">{PAGE_HISTORY_LEDE}</p>
        <div className="mt-6 border-y border-border py-4">
          <p className="mb-3 font-mono text-xs text-muted-foreground">{EXAMPLE_SITE}</p>
          <ProbeHistory />
        </div>
        <div className="mt-8 grid gap-8">
          <figure>
            <Image src={SHOT_REQUESTS} alt={FIGURE_REQUESTS} width={1852} height={438} className="h-auto w-full border border-border" />
            <figcaption className="mt-2 text-sm text-muted-foreground">{FIGURE_REQUESTS}</figcaption>
          </figure>
          <figure>
            <Image src={SHOT_ENV} alt={FIGURE_ENV} width={1852} height={296} className="h-auto w-full border border-border" />
            <figcaption className="mt-2 text-sm text-muted-foreground">{FIGURE_ENV}</figcaption>
          </figure>
        </div>
        <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/docs" className="border-b border-border">
            {PAGE_DOCS}
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
      <footer className="mx-auto w-full max-w-6xl px-5 pb-10 text-sm text-muted-foreground">
        <p>{PAGE_SOURCE}</p>
        <p className="mt-2">{PAGE_FOOTER}</p>
      </footer>
    </>
  );
}
