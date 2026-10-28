import Link from "next/link";
import { DemoForm } from "@/features/demo/ui/demo-form";
import { FUTURE_ASK, FUTURE_PATH, FUTURE_STATUS, type FuturePain } from "@/fsd/pages/future/pains";
import { LABEL_DEMO } from "@/fsd/pages/site/nav";
import { SiteFrame } from "@/fsd/pages/site/frame";
import { PAGE_AFTER, PAGE_H2, PAGE_H3, PAGE_KICKER, PAGE_LEDE, PAGE_MAIN, PAGE_MARK, PAGE_SECTION, PAGE_TITLE } from "@/fsd/pages/site/space";
import { PainSketch } from "@/fsd/pages/future/ui/pain-sketch";

export function PainPage({ host, pain }: { host: string; pain: FuturePain }) {
  return (
    <SiteFrame host={host}>
      <main className={PAGE_MAIN}>
        <p className={PAGE_KICKER}>
          <Link href={FUTURE_PATH}>{FUTURE_STATUS}</Link>
        </p>
        <h1 className={PAGE_TITLE}>{pain.title}</h1>
        <p className={PAGE_LEDE}>{pain.pain}</p>
        <PainSketch slug={pain.slug} />
        <ol className={`${PAGE_AFTER} grid gap-4`}>
          {pain.ideas.map((idea, index) => (
            <li key={idea.title} className="rise grid gap-x-6 gap-y-3 border border-border bg-card/70 p-6 md:grid-cols-[4rem_1fr]" style={{ animationDelay: `${index * 55}ms` }}>
              <p className={PAGE_MARK}>{String(index + 1).padStart(2, "0")}</p>
              <div>
                <h2 className={PAGE_H3}>{idea.title}</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{idea.how}</p>
              </div>
            </li>
          ))}
        </ol>
        <section className={`${PAGE_SECTION} grid gap-8 border-t border-border pt-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)]`}>
          <div>
            <h2 className={PAGE_H2}>{LABEL_DEMO}</h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{FUTURE_ASK}</p>
          </div>
          <DemoForm interest={pain.slug} interestLabel={pain.title} />
        </section>
      </main>
    </SiteFrame>
  );
}
