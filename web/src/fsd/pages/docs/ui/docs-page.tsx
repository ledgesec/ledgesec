import {
  AGENT_ENV,
  AGENT_FILE,
  CONNECTIONS,
  DIAGRAM_CAPTION,
  DIAGRAM_EUROPE,
  DIAGRAM_EUROPE_BODY,
  DIAGRAM_NEW_YORK,
  DIAGRAM_NEW_YORK_BODY,
  DIAGRAM_ORIGIN,
  DIAGRAM_ORIGIN_BODY,
  DIAGRAM_VISITOR,
  DOCS_ASIDE,
  DOCS_KICKER,
  DOCS_LEDE,
  DOCS_TITLE,
  INGEST_URL,
  SHARED_BODY,
  SHARED_TITLE,
} from "@/fsd/pages/docs/connect";
import { SiteFrame } from "@/fsd/pages/site/frame";
import { PAGE_AFTER, PAGE_H2, PAGE_H3, PAGE_KICKER, PAGE_LEDE, PAGE_MAIN, PAGE_SECTION, PAGE_TITLE } from "@/fsd/pages/site/space";

function Box({ title, body }: { title: string; body?: string }) {
  return (
    <div className="border border-border px-5 py-4">
      <p>{title}</p>
      {body ? <p className="mt-1 text-sm text-muted-foreground">{body}</p> : null}
    </div>
  );
}

export function DocsPage({ host }: { host: string }) {
  return (
    <SiteFrame host={host}>
      <main className={PAGE_MAIN}>
        <p className={PAGE_KICKER}>{DOCS_KICKER}</p>
        <h1 className={PAGE_TITLE}>{DOCS_TITLE}</h1>
        <p className={PAGE_LEDE}>{DOCS_LEDE}</p>
        <figure className={PAGE_AFTER}>
          <div className="grid gap-3">
            <Box title={DIAGRAM_VISITOR} />
            <div className="relative mx-auto h-8 w-px bg-border" aria-hidden="true">
              <span className="travel-down size-2 -translate-x-1/2 rounded-full bg-primary" />
            </div>
            <Box title={DIAGRAM_ORIGIN} body={DIAGRAM_ORIGIN_BODY} />
            <div className="grid gap-3 sm:grid-cols-3">
              {CONNECTIONS.map((item) => (
                <Box key={item.title} title={item.title} body={item.diagram} />
              ))}
            </div>
            <div className="relative mx-auto h-8 w-px bg-border" aria-hidden="true">
              <span className="travel-down size-2 -translate-x-1/2 rounded-full bg-primary" />
            </div>
            <p className="text-center font-mono text-xs text-muted-foreground">{INGEST_URL}</p>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
              <Box title={DIAGRAM_EUROPE} body={DIAGRAM_EUROPE_BODY} />
              <Box title={DIAGRAM_NEW_YORK} body={DIAGRAM_NEW_YORK_BODY} />
            </div>
          </div>
          <figcaption className="mt-3 text-sm text-muted-foreground">{DIAGRAM_CAPTION}</figcaption>
        </figure>
        <h2 className={`${PAGE_SECTION} ${PAGE_H2}`}>{SHARED_TITLE}</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">{SHARED_BODY}</p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">{AGENT_ENV}</p>
        <pre className="mt-4 overflow-x-auto border border-border bg-card p-5 font-mono text-xs leading-6">{AGENT_FILE}</pre>
        <div className={`${PAGE_SECTION} grid gap-16`}>
          {CONNECTIONS.map((item) => (
            <section key={item.title}>
              <h2 className={PAGE_H3}>{item.title}</h2>
              <p className="mt-4 max-w-3xl text-muted-foreground">{item.body}</p>
              <pre className="mt-4 overflow-x-auto border border-border bg-card p-5 font-mono text-xs leading-6">{item.code}</pre>
            </section>
          ))}
        </div>
        <p className={`${PAGE_SECTION} text-sm text-muted-foreground`}>{DOCS_ASIDE}</p>
      </main>
    </SiteFrame>
  );
}
