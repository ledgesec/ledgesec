import Link from "next/link";
import { SiteHeader } from "@/widgets/site-header/ui/site-header";

export function HomePage({ host }: { host: string }) {
  return (
    <>
      <SiteHeader host={host} />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pt-16 pb-20">
        <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">DNS edge</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight font-medium tracking-tight md:text-5xl">
          See the traffic before you stop it.
        </h1>
        <p className="mt-5 text-lg leading-relaxed">
          Ledgesec watches requests at the edge. The first install records them and lets them through. It does not challenge a visitor and it does not deny one.
        </p>
        <h2 className="mt-12 font-serif text-2xl font-medium">What the first install does</h2>
        <dl className="mt-4 divide-y divide-border border-y border-border">
          <div className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr]">
            <dt>Observe</dt>
            <dd className="text-muted-foreground">The request continues to the customer&apos;s application.</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr]">
            <dt>Record</dt>
            <dd className="text-muted-foreground">A path, a time, and an edge. No body, no cookie, no query string.</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr]">
            <dt>Two edges</dt>
            <dd className="text-muted-foreground">Europe keeps the journal. New York is a second edge, not a second copy.</dd>
          </div>
        </dl>
        <p className="mt-8">
          <Link href="/blog/observe-first" className="border-b border-border">
            Why the first install only watches
          </Link>
        </p>
      </main>
      <footer className="mx-auto w-full max-w-xl px-5 pb-10 text-sm text-muted-foreground">
        ledgesec.com is the site. The site cabinet is dash. The admin cabinet is a separate host.
      </footer>
    </>
  );
}
