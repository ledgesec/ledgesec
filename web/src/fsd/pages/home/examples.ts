export const EXAMPLE_SITE = "shop.example";

export const EXAMPLE_PROBES = [
  {
    ts: "2026-10-28T09:14:02Z",
    country: "DE",
    ua: "curl/8.7.1",
    path: "/.env",
    method: "GET",
    status: 404,
  },
  {
    ts: "2026-10-28T09:14:11Z",
    country: "US",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131 Safari/537.36",
    path: "/.git/config",
    method: "GET",
    status: 404,
  },
  {
    ts: "2026-10-28T09:22:40Z",
    country: "NL",
    ua: "python-requests/2.32",
    path: "/wp-login.php",
    method: "POST",
    status: 404,
  },
  {
    ts: "2026-10-28T11:03:18Z",
    country: "SG",
    ua: "Go-http-client/1.1",
    path: "/storage/.env",
    method: "GET",
    status: 403,
  },
  {
    ts: "2026-10-28T11:40:05Z",
    country: "BR",
    ua: "curl/8.7.1",
    path: "/backup.sql",
    method: "GET",
    status: 404,
  },
] as const;

const ADDRESS = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export function exampleOmitsAddresses() {
  return (
    EXAMPLE_SITE.endsWith(".example") &&
    EXAMPLE_PROBES.every((row) => {
      const fields = Object.keys(row);
      return (
        !fields.includes("ip") &&
        !fields.includes("address") &&
        row.path.startsWith("/") &&
        !ADDRESS.test(row.ua) &&
        !row.ua.toLowerCase().includes("ledgesec")
      );
    })
  );
}
