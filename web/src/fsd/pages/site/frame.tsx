import type { ReactNode } from "react";
import Link from "next/link";
import { PAGE_FOOTER, PAGE_SOURCE, SOURCE_HREF, SOURCE_LABEL } from "@/fsd/pages/home/overview";
import { LABEL_DEMO, NAV, PATH_DEMO } from "@/fsd/pages/site/nav";
import { marketingHref } from "@/shared/lib/hosts";
import { SiteHeader } from "@/widgets/site-header/ui/site-header";

const SPOTS = [
  { top: "14%", left: "6%", size: "0.55rem", delay: "-6s", kind: "a" },
  { top: "8%", left: "78%", size: "0.35rem", delay: "-14s", kind: "b" },
  { top: "32%", left: "46%", size: "0.4rem", delay: "-2s", kind: "c" },
  { top: "58%", left: "18%", size: "0.3rem", delay: "-18s", kind: "d" },
  { top: "72%", left: "64%", size: "0.5rem", delay: "-9s", kind: "a" },
  { top: "22%", left: "88%", size: "0.28rem", delay: "-22s", kind: "b" },
  { top: "84%", left: "34%", size: "0.38rem", delay: "-11s", kind: "c" },
  { top: "44%", left: "12%", size: "0.32rem", delay: "-16s", kind: "d" },
] as const;

export function SiteFrame({ host, children }: { host: string; children: ReactNode }) {
  return (
    <div className="site flex min-h-screen flex-1 flex-col">
      <div className="site-field" aria-hidden="true">
        <span className="glow glow-a" />
        <span className="glow glow-b" />
        {SPOTS.map((spot) => (
          <span
            key={`${spot.top}-${spot.left}`}
            className={`spot spot-${spot.kind}`}
            style={{ top: spot.top, left: spot.left, width: spot.size, height: spot.size, animationDelay: spot.delay, opacity: 0.55 }}
          />
        ))}
      </div>
      <SiteHeader host={host} />
      {children}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-6 px-5 py-8 text-sm text-muted-foreground">
          <div>
            <p>{PAGE_SOURCE}</p>
            <p className="mt-2 max-w-xl">{PAGE_FOOTER}</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {NAV.map((item) => (
              <Link key={item.href} href={marketingHref(host, item.href)}>
                {item.label}
              </Link>
            ))}
            <Link href={marketingHref(host, PATH_DEMO)}>{LABEL_DEMO}</Link>
            <Link href={SOURCE_HREF}>{SOURCE_LABEL}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
