export const ABOUT_TITLE = "About the journal";
export const ABOUT_DESCRIPTION =
  "Ledgesec keeps the access log of a web server you already run. Europe stores the journal. The collector does not change the request.";
export const ABOUT_KICKER = "About";
export const ABOUT_LEDE =
  "Ledgesec is the journal for an access log you already have. The request still reaches the application. The collector does not change the request, and it does not challenge a visitor or deny one.";

export const ABOUT_SECTIONS = [
  {
    title: "Who it is for",
    body: "Someone who runs nginx, OpenResty, or a Coolify proxy and wants every request kept, including a path the server does not have. DNS stays where it is. The first collectors are the OpenResty module, the Linux daemon, and Coolify.",
  },
  {
    title: "Where the journal lives",
    body: "Europe holds Postgres, ClickHouse, the API, the site, and both cabinets. A line stays for three years. New York is a separate edge for us.ledgesec.com. It does not store the journal and it is not on the customer's request path.",
  },
  {
    title: "What a line leaves out",
    body: "The body, the cookie, the query string, and the Referer stay out. An admin sees the visitor address in the cabinet. A user of a site sees that site's requests without addresses. This site does not show visitor addresses.",
  },
  {
    title: "What it refuses to be",
    body: "This is not a firewall. Observation does not stop traffic. Challenge and deny stay off. The project is MIT, and the cabinet is a view of the log, not a second copy of a security operations board.",
  },
] as const;

export function aboutText() {
  return [ABOUT_TITLE, ABOUT_DESCRIPTION, ABOUT_LEDE, ...ABOUT_SECTIONS.flatMap((item) => [item.title, item.body])].join(" ");
}
