import type { ReactNode } from "react";
import Link from "next/link";
import { dashboardHref, siteHref } from "@/shared/lib/hosts";

export function SiteHeader({
  host,
  trailing,
}: {
  host: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-baseline justify-between gap-4 px-5 pt-6">
      <Link href={siteHref(host)} className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
        Ledgesec
      </Link>
      <nav className="flex items-baseline gap-4 text-sm">
        <Link href={host.startsWith("dash.") ? "https://ledgesec.com/docs" : "/docs"} className="border-b border-border">
          Docs
        </Link>
        <Link href={host.startsWith("dash.") ? "https://ledgesec.com/blog" : "/blog"} className="border-b border-border">
          Blog
        </Link>
        {trailing ?? (
          <Link href={dashboardHref(host)} className="border-b border-border">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
