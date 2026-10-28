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
import { SiteHeader } from "@/widgets/site-header/ui/site-header";

function Box({ title, body }: { title: string; body?: string }) {
  return (
    <div className="border border-border px-4 py-3">
      <p>{title}</p>
      {body ? <p className="mt-1 text-sm text-muted-foreground">{body}</p> : null}
    </div>
  );
}

export function DocsPage({ host }: { host: string }) {
  return (
    <>
      <SiteHeader host={host} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-12 pb-20">
        <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">{DOCS_KICKER}</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight font-medium tracking-tight">{DOCS_TITLE}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed">{DOCS_LEDE}</p>
        <figure className="mt-10">
          <div className="grid gap-3">
            <Box title={DIAGRAM_VISITOR} />
            <p className="text-center text-muted-foreground" aria-hidden="true">
              ↓
            </p>
            <Box title={DIAGRAM_ORIGIN} body={DIAGRAM_ORIGIN_BODY} />
            <div className="grid gap-3 sm:grid-cols-3">
              {CONNECTIONS.map((item) => (
                <Box key={item.title} title={item.title} body={item.diagram} />
              ))}
            </div>
            <p className="text-center text-muted-foreground" aria-hidden="true">
              ↓
            </p>
            <p className="text-center font-mono text-xs text-muted-foreground">{INGEST_URL}</p>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
              <Box title={DIAGRAM_EUROPE} body={DIAGRAM_EUROPE_BODY} />
              <Box title={DIAGRAM_NEW_YORK} body={DIAGRAM_NEW_YORK_BODY} />
            </div>
          </div>
          <figcaption className="mt-3 text-sm text-muted-foreground">{DIAGRAM_CAPTION}</figcaption>
        </figure>
        <h2 className="mt-12 font-serif text-2xl font-medium">{SHARED_TITLE}</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">{SHARED_BODY}</p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">{AGENT_ENV}</p>
        <pre className="mt-3 overflow-x-auto border border-border bg-card p-4 font-mono text-xs leading-6">{AGENT_FILE}</pre>
        <div className="mt-10 grid gap-10">
          {CONNECTIONS.map((item) => (
            <section key={item.title}>
              <h2 className="font-serif text-2xl font-medium">{item.title}</h2>
              <p className="mt-4 max-w-3xl text-muted-foreground">{item.body}</p>
              <pre className="mt-4 overflow-x-auto border border-border bg-card p-4 font-mono text-xs leading-6">{item.code}</pre>
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted-foreground">{DOCS_ASIDE}</p>
      </main>
    </>
  );
}
