export function dashboardHref(host: string) {
  if (host.startsWith("dash.")) return "/";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return "/dashboard";
  return "https://dash.ledgesec.com";
}

export function siteHref(host: string) {
  if (host.startsWith("dash.")) return "https://ledgesec.com";
  return "/";
}
