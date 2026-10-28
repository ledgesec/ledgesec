export const PRODUCT_TITLE = "What the journal keeps";
export const PRODUCT_DESCRIPTION =
  "A host is the whole web server. A site is the Host header. Each request the collector saw becomes one line, with the country and User-Agent when they were sent.";
export const PRODUCT_KICKER = "Product";
export const PRODUCT_LEDE =
  "Ledgesec is a reading instrument for the access log. A host is the whole web server. A site is the Host header the proxy passed to the application. A name that only hit a catch-all stays in the journal and does not become a site.";

export const PRODUCT_SECTIONS = [
  {
    title: "A line",
    body: "When the collector sent them, a line carries the time, method, path, status, response size, protocol, TLS, and User-Agent. A country code is added from a local database when the batch arrives. The query string, the body, the cookie, and the Referer stay out.",
  },
  {
    title: "A probe",
    body: "Paths such as /.env, /.htaccess, /.git, wp-login, dumps, and database panels are marked when the journal is read. An admin adds a template under Probes. /.env inside a directory is a probe too. Open a probe path and the journal lists those requests: the time, the country, and the User-Agent.",
  },
  {
    title: "Who sees what",
    body: "An admin and a user share one session. An admin sees addresses for every edge. A user sees the requests of their hosts, without addresses. A user cannot open an admin method. The public site never draws a visitor address.",
  },
  {
    title: "How long a line stays",
    body: "A line stays for three years, then ClickHouse drops it. Deleting a host does not erase rows already written. A disabled site is not written further. The master after install waits for the site name and closes when that name arrives.",
  },
  {
    title: "How a server reports",
    body: "OpenResty writes the line with log_by_lua after the response. Plain nginx uses the Linux daemon, which tails the access log and leaves nginx itself alone. Coolify tails the proxy log, including a name the proxy did not route to an application. DNS and Apache are listed in the cabinet and cannot be added yet. The collector does not change the request.",
  },
] as const;

export function productText() {
  return [PRODUCT_TITLE, PRODUCT_DESCRIPTION, PRODUCT_LEDE, ...PRODUCT_SECTIONS.flatMap((item) => [item.title, item.body])].join(" ");
}
