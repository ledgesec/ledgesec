import type { ReactNode } from "react";
import { CONNECTIONS, DIAGRAM_EUROPE, DIAGRAM_NEW_YORK } from "@/fsd/pages/docs/connect";
import { EXAMPLE_SITE } from "@/fsd/pages/home/examples";
import {
  FLOW_AFTER,
  FLOW_ANSWERS,
  FLOW_APP,
  FLOW_ASK,
  FLOW_ASIDE,
  FLOW_CAPTION,
  FLOW_EUROPE,
  FLOW_JOURNAL,
  FLOW_NY,
  FLOW_READ,
  FLOW_READ_BODY,
  FLOW_UNCHANGED,
  FLOW_VISITOR,
} from "@/fsd/pages/site/flow";
import { PAGE_MARK } from "@/fsd/pages/site/space";

function Stage({ kicker, title, body, quiet = false, children }: { kicker: string; title: string; body: string; quiet?: boolean; children?: ReactNode }) {
  return (
    <div className={`min-w-0 flex-1 border px-5 py-4 ${quiet ? "border-dashed border-border" : "border-border bg-card"}`}>
      <p className={PAGE_MARK}>{kicker}</p>
      <p className="mt-2 font-serif text-xl">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

function Track() {
  return (
    <div className="relative h-7 shrink-0 lg:h-auto lg:w-12" aria-hidden="true">
      <div className="absolute top-0 left-1/2 h-full w-px bg-primary/70 lg:top-1/2 lg:right-0 lg:left-0 lg:h-px lg:w-auto" />
      <span className="travel-down size-2 -translate-x-1/2 rounded-full bg-primary lg:hidden" />
      <span className="travel hidden size-2 -translate-y-1/2 rounded-full bg-primary lg:block" />
    </div>
  );
}

export function JournalFlow() {
  return (
    <figure className="rise mt-16">
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        <Stage kicker={FLOW_VISITOR} title={FLOW_ASK} body={EXAMPLE_SITE} />
        <Track />
        <Stage kicker={FLOW_APP} title={FLOW_ANSWERS} body={FLOW_UNCHANGED} />
        <Track />
        <Stage kicker={FLOW_READ} title={FLOW_AFTER} body={FLOW_READ_BODY}>
          <ul className="mt-3 flex flex-wrap gap-2">
            {CONNECTIONS.map((item) => (
              <li key={item.title} className="border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
                {item.title}
              </li>
            ))}
          </ul>
        </Stage>
      </div>
      <div className="mt-3 hidden h-8 lg:grid lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)_3rem_minmax(0,1fr)]" aria-hidden="true">
        <div />
        <div />
        <div />
        <div />
        <div className="relative mx-auto w-px bg-primary/70">
          <span className="travel-down size-2 -translate-x-1/2 rounded-full bg-primary" />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)_3rem_minmax(0,1fr)]">
        <div className="lg:col-start-5">
          <Stage kicker={DIAGRAM_EUROPE} title={FLOW_JOURNAL} body={FLOW_EUROPE} />
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <Stage kicker={DIAGRAM_NEW_YORK} title={FLOW_ASIDE} body={FLOW_NY} quiet />
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">{FLOW_CAPTION}</figcaption>
    </figure>
  );
}
