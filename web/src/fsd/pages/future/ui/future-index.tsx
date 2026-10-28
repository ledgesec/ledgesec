import Link from "next/link";
import {
  FUTURE_KICKER,
  FUTURE_LEDE,
  FUTURE_PATH,
  FUTURE_STATUS,
  FUTURE_TITLE,
  PAINS,
} from "@/fsd/pages/future/pains";
import { LABEL_DEMO, PATH_DEMO } from "@/fsd/pages/site/nav";
import { SiteFrame } from "@/fsd/pages/site/frame";
import { PAGE_AFTER, PAGE_CARD, PAGE_CTA, PAGE_H3, PAGE_KICKER, PAGE_LEDE, PAGE_MAIN, PAGE_MARK, PAGE_SECTION, PAGE_TITLE } from "@/fsd/pages/site/space";
import { JournalFlow } from "@/fsd/pages/site/ui/journal-flow";
import { marketingHref } from "@/shared/lib/hosts";

export function FutureIndex({ host }: { host: string }) {
  return (
    <SiteFrame host={host}>
      <main className={PAGE_MAIN}>
        <p className={PAGE_KICKER}>{FUTURE_KICKER}</p>
        <h1 className={PAGE_TITLE}>{FUTURE_TITLE}</h1>
        <p className={PAGE_LEDE}>{FUTURE_LEDE}</p>
        <JournalFlow />
        <ol className={`${PAGE_AFTER} grid gap-4 md:grid-cols-2`}>
          {PAINS.map((pain, index) => (
            <li key={pain.slug} className="rise" style={{ animationDelay: `${index * 50}ms` }}>
              <Link href={`${FUTURE_PATH}/${pain.slug}`} className={`${PAGE_CARD} block h-full`}>
                <p className={PAGE_MARK}>
                  {String(index + 1).padStart(2, "0")} · {FUTURE_STATUS}
                </p>
                <h2 className={`mt-3 ${PAGE_H3}`}>{pain.title}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{pain.pain}</p>
                <span className="mt-4 flex gap-1" aria-hidden="true">
                  {pain.ideas.map((idea, mark) => (
                    <span key={idea.title} className="pip h-1 flex-1 bg-primary" style={{ animationDelay: `${240 + mark * 40}ms` }} />
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <p className={PAGE_SECTION}>
          <Link href={marketingHref(host, PATH_DEMO)} className={PAGE_CTA}>
            {LABEL_DEMO}
          </Link>
        </p>
      </main>
    </SiteFrame>
  );
}
