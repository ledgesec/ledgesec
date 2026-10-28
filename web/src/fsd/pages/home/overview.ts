export const SITE_NAME = "Ledgesec";
export const SITE_URL = "https://ledgesec.com";
export const SOCIAL_TITLE = "Ledgesec, a journal of web server requests";
export const SITE_DESCRIPTION =
  "Ledgesec reads the nginx or Coolify access log into a journal. A probe path lists the country and User-Agent. The collector does not change the request.";

export const PAGE_KICKER = "Request journal";
export const PAGE_TITLE = "A journal of the web server's requests.";
export const PAGE_LEDE =
  "Ledgesec reads the access log and keeps the line. The request still reaches the application. This is not a firewall: it does not challenge a visitor and it does not deny one.";
export const PAGE_HOW = "How a line gets into the journal";

export const PAGE_STEPS = [
  {
    title: "Collector",
    body: "A host is the whole web server. In the cabinet you add it and choose how it reports. Nginx uses an OpenResty module after the response. The Linux daemon tails the nginx access log and leaves nginx itself alone. Coolify tails the proxy log, including a name the proxy did not route to an application.",
  },
  {
    title: "Batch",
    body: "The collector posts a batch and does not change the request. A line can carry the time, method, path, status, response size, protocol, TLS, and User-Agent, when the collector sent them. The query string, the body, the cookie, and the Referer stay out. A country code is added from a local database when the batch arrives. The site name is the Host header the proxy passed to the application.",
  },
  {
    title: "Cabinet",
    body: "Requests, probes, and sites are separate pages. An admin sees the visitor address. A user of a site sees that site's requests without addresses. A path such as /.env, /.git, or wp-login is marked when the journal is read. A row stays for three years. Removing a host does not erase rows already written.",
  },
] as const;

export const PAGE_WHO = "Who it helps";
export const PAGE_WHEN = "When it helps";

export const PAGE_WHO_ITEMS = [
  {
    title: "You run the web server",
    body: "Nginx, OpenResty, or a Coolify proxy. The host is the whole server. A path the server does not have still lands in the journal, so a scan is visible.",
  },
  {
    title: "You own a site",
    body: "You see that site's requests: the path, the status, the country, and the User-Agent. Visitor addresses stay off your pages.",
  },
  {
    title: "You look after every host",
    body: "An admin sees addresses across the edges, adds a host for someone else, and adds a probe template. A site user cannot open that view.",
  },
] as const;

export const PAGE_WHEN_ITEMS = [
  {
    title: "A scanner asks for a file",
    body: "A request for /.env, /.git, or wp-login is marked when the journal is read. The application has already answered. The collector did not change the request.",
  },
  {
    title: "You want the line later",
    body: "A row stays for three years. Removing a host does not erase rows already written. A disabled site is not written further.",
  },
  {
    title: "The server should keep answering",
    body: "Use it when the request must still reach the application. Challenge and deny stay off. Apache and DNS are listed and cannot be added yet.",
  },
] as const;

export const PAGE_SOURCE = "The project is MIT.";
export const SOURCE_HREF = "https://github.com/ledgesec/ledgesec";
export const SOURCE_LABEL = "Source";
export const PAGE_FOOTER = "ledgesec.com is the site. The site cabinet is dash. The admin cabinet is a separate host.";
export const PAGE_NOTE = "How the collector reads the log";
export const PAGE_DOCS = "Connections and the layout";
export const PAGE_HISTORY = "Probe history";
export const PAGE_HISTORY_LEDE =
  "Open a probe path and the journal lists those requests: the time, the country, and the User-Agent. The rows here are an example for shop.example. Visitor addresses are not on this page.";
export const FIGURE_REQUESTS = "Example cabinet. Probe requests for shop.example, with country and User-Agent.";
export const FIGURE_ENV = "Example cabinet. Requests for /.env on shop.example.";
export const SHOT_REQUESTS = "/examples/probe-requests.png";
export const SHOT_ENV = "/examples/probe-env.png";

export const PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  codeRepository: SOURCE_HREF,
  license: "https://opensource.org/licenses/MIT",
  programmingLanguage: ["TypeScript", "Python", "Rust"],
};

const FORBIDDEN = ["incident", "mttd", "mttr", "vulnerabilit", "blocked", "cve", "endpoint"];

export function pageText() {
  return [
    PAGE_KICKER,
    PAGE_TITLE,
    PAGE_LEDE,
    PAGE_HOW,
    ...PAGE_STEPS.flatMap((step) => [step.title, step.body]),
    PAGE_WHO,
    ...PAGE_WHO_ITEMS.flatMap((item) => [item.title, item.body]),
    PAGE_WHEN,
    ...PAGE_WHEN_ITEMS.flatMap((item) => [item.title, item.body]),
    PAGE_HISTORY,
    PAGE_HISTORY_LEDE,
    FIGURE_REQUESTS,
    FIGURE_ENV,
    PAGE_DOCS,
    SOURCE_HREF,
    PAGE_SOURCE,
    PAGE_FOOTER,
    SITE_DESCRIPTION,
  ]
    .join(" ")
    .toLowerCase();
}

export function staysInsideObservation(text: string) {
  const folded = text.toLowerCase();
  return FORBIDDEN.every((word) => !folded.includes(word));
}

export function pageStaysInsideObservation() {
  return staysInsideObservation(pageText());
}
