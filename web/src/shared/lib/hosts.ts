export type Surface = "site" | "client" | "admin";

export function surfaceOf(host: string): Surface {
  const name = host.split(":")[0].toLowerCase();
  if (name === "admin.ledgesec.com" || name.startsWith("admin.")) return "admin";
  if (name === "dash.ledgesec.com" || name.startsWith("dash.")) return "client";
  return "site";
}

export function dashboardHref(host: string) {
  if (surfaceOf(host) === "client") return "/";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return "/dashboard";
  return "https://dash.ledgesec.com";
}

export function adminHref(host: string) {
  if (surfaceOf(host) === "admin") return "/";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return "/admin";
  return "https://admin.ledgesec.com";
}

export function siteHref(host: string) {
  if (surfaceOf(host) === "site") return "/";
  return "https://ledgesec.com";
}
