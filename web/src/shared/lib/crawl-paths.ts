import { surfaceOf } from "./hosts.ts";

export const ROBOTS_PATH = "/robots.txt";
export const SITEMAP_PATH = "/sitemap.xml";
export const LLMS_PATH = "/llms.txt";
export const LLMS_FULL_PATH = "/llms-full.txt";
export const HUMANS_PATH = "/humans.txt";

export const CRAWL_PATHS = [ROBOTS_PATH, SITEMAP_PATH, LLMS_PATH, LLMS_FULL_PATH, HUMANS_PATH] as const;

const SITE_DISALLOW = ["/dashboard", "/admin", "/api/"] as const;

export function isCrawlPath(pathname: string) {
  return (CRAWL_PATHS as readonly string[]).includes(pathname);
}

export function robotsDisallow(host: string): readonly string[] {
  if (surfaceOf(host) !== "site") return ["/"];
  return SITE_DISALLOW;
}
