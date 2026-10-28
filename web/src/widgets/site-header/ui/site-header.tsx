import Link from "next/link";
import { LABEL_DEMO, LABEL_SIGN_IN, NAV, PATH_DEMO } from "@/fsd/pages/site/nav";
import { PAGE_CTA } from "@/fsd/pages/site/space";
import { dashboardHref, marketingHref, siteHref } from "@/shared/lib/hosts";

export function SiteHeader({ host }: { host: string }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
        <Link href={siteHref(host)} className="font-serif text-xl tracking-tight">
          Ledgesec
        </Link>
        <nav className="order-3 flex w-full flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground md:order-none md:w-auto">
          {NAV.map((item) => (
            <Link key={item.href} href={marketingHref(host, item.href)} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <Link href={dashboardHref(host)} className="text-muted-foreground hover:text-foreground">
            {LABEL_SIGN_IN}
          </Link>
          <Link href={marketingHref(host, PATH_DEMO)} className={PAGE_CTA}>
            {LABEL_DEMO}
          </Link>
        </div>
      </div>
    </header>
  );
}
