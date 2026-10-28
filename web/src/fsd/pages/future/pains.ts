export const FUTURE_PATH = "/future";
export const FUTURE_STATUS = "Not built";
export const FUTURE_KICKER = "Future";
export const FUTURE_TITLE = "What we might build next";
export const FUTURE_DESCRIPTION =
  "Ten pains the journal does not solve yet. Each page lists ten ways we could meet it. None of this is in the product.";
export const FUTURE_LEDE =
  "The journal keeps the access log. These pages are the pains it does not solve yet. Each one has ten ways we could meet it. A note at the bottom tells us which pain you want. Nothing here refuses a request.";
export const FUTURE_ASK = "If this pain is yours, send a note. It names this page.";

export type FutureIdea = { title: string; how: string };
export type FuturePain = {
  slug: string;
  title: string;
  pain: string;
  ideas: readonly FutureIdea[];
};

export const PAINS: readonly FuturePain[] = [
  {
    slug: "notice",
    title: "A probe is written and nobody is told",
    pain: "The line sits in the journal until someone opens the cabinet. A scan of /.env can finish before anyone looks.",
    ideas: [
      { title: "A new path", how: "When a probe path shows up for the first time today, the cabinet marks it." },
      { title: "The last hour", how: "The host page shows how many probe requests arrived in the last hour." },
      { title: "A note to the owner", how: "Mail or Telegram tells the host owner the path, the country, and the User-Agent." },
      { title: "No address for a site user", how: "That note leaves the visitor address out, the same way the site cabinet does." },
      { title: "Quiet hours", how: "At night the note waits, and the morning brings one list." },
      { title: "Repeat first", how: "One stray line stays quiet. The note starts after the same path repeats." },
      { title: "Per host", how: "The admin can turn the note off for one host and leave the others on." },
      { title: "A new template", how: "A probe template the admin just added is included the next time the journal is read." },
      { title: "A link to the path", how: "The note opens the requests for that path, not a second copy of the log." },
      { title: "A late batch", how: "If the collector was behind, the note says the batch arrived late." },
    ],
  },
  {
    slug: "stop",
    title: "The request still reaches the application",
    pain: "Today the collector only reads the log. The request is not changed, not challenged, and not refused. Some operators want a later choice.",
    ideas: [
      { title: "Off by default", how: "A host has no challenge and no refuse until someone turns that choice on." },
      { title: "Challenge", how: "A later mode can show a challenge page, and the journal still keeps the line." },
      { title: "Refuse one path", how: "Refuse only a path the admin marked, not every probe." },
      { title: "Dry run", how: "The journal says what would have been refused, and the request still passes." },
      { title: "Admin only", how: "A site user cannot turn this on." },
      { title: "OpenResty only", how: "Only the module that already sits in the request can stand in front. The daemon only reads the log." },
      { title: "Coolify stays a reader", how: "The proxy log is after the fact, so that collector cannot refuse anything." },
      { title: "The line remains", how: "A refused request is still a journal line, with the reason written on it." },
      { title: "Separate from install", how: "Installing the collector does not turn the choice on." },
      { title: "This page does not turn it on", how: "Asking about it here does not change a live host." },
    ],
  },
  {
    slug: "collectors",
    title: "Apache and DNS cannot be added",
    pain: "The cabinet lists Apache and DNS, and both stay unavailable. Caddy and Angie on the customer machine are not packages yet.",
    ideas: [
      { title: "Apache log", how: "Apache would tail its access log the way the Linux daemon tails nginx." },
      { title: "A format line", how: "The cabinet would show the Apache log format next to the nginx one." },
      { title: "The same batch", how: "The batch posted to the journal would be the same shape." },
      { title: "The same env file", how: "The host id and the ingest secret stay the ones from the cabinet." },
      { title: "DNS is another journal", how: "A DNS collector would read a query log, not an HTTP path." },
      { title: "Still listed", how: "Until the collector exists, the cabinet keeps the choice visible and unavailable." },
      { title: "Caddy on the customer machine", how: "A package when a customer runs Caddy, separate from our own edge." },
      { title: "Angie", how: "A package when a customer asks for Angie." },
      { title: "No pretend", how: "A collector that cannot read the log does not invent lines." },
      { title: "The request stays put", how: "These collectors would still not change the request." },
    ],
  },
  {
    slug: "query",
    title: "The query string is missing",
    pain: "A scan can hide in the query. The journal leaves the query, the body, the cookie, and the Referer out.",
    ideas: [
      { title: "Keys only", how: "Keep the query key names and drop the values, so a secret in the value stays out." },
      { title: "Opt in", how: "A host can choose to keep the query. The default stays as it is now." },
      { title: "Body stays out", how: "No later mode keeps the body." },
      { title: "Cookie stays out", how: "No later mode keeps the cookie." },
      { title: "Referer stays out", how: "The Referer stays out unless a separate opt-in says otherwise." },
      { title: "A probe in a key", how: "A probe template can match a query key, not only a path." },
      { title: "On the row", how: "When keys were kept, the request row shows them." },
      { title: "A day of shapes", how: "For one day the cabinet can show the shape it would have kept, without storing it." },
      { title: "Admin chooses", how: "The admin sets the choice. The site user sees the result without addresses." },
      { title: "The public site stays clear", how: "This site still does not draw a visitor address." },
    ],
  },
  {
    slug: "names",
    title: "A catch-all name never becomes a site",
    pain: "A Host name that only hit the catch-all stays in the journal and does not become a site. Finding it means reading rows.",
    ideas: [
      { title: "The leftover names", how: "A list of Host names that never became a site." },
      { title: "Make it a site", how: "One action turns a leftover name into a site." },
      { title: "Call it noise", how: "A rule keeps a name from becoming a site." },
      { title: "Group names", how: "Several names on one host sit together in the cabinet." },
      { title: "A disabled site", how: "It stays in the list and is not written further." },
      { title: "Port or no port", how: "The admin can treat a name with a port as the same site." },
      { title: "The master", how: "After install, the master still closes when the first real name arrives." },
      { title: "Search", how: "Search across the names on that host." },
      { title: "Probes per name", how: "The day shows how many probe requests each name had." },
      { title: "Which edge", how: "The admin sees the edge that observed the name." },
    ],
  },
  {
    slug: "silence",
    title: "The collector stops and the journal just sits",
    pain: "If the daemon stops, the disk fills, or the log path rotates, the journal stops growing and nobody is told.",
    ideas: [
      { title: "Last batch", how: "The host shows the time of the last batch." },
      { title: "A quiet window", how: "The host is quiet when no batch arrived for a chosen number of minutes." },
      { title: "A note", how: "The owner hears when the quiet stretch starts." },
      { title: "It returns", how: "The note stops when a batch arrives again." },
      { title: "Not deleted", how: "A quiet host stays in the cabinet." },
      { title: "Why it might be quiet", how: "A stopped daemon, a full disk, or a log that moved." },
      { title: "Agent version", how: "The cabinet shows the build the host last sent." },
      { title: "Different windows", how: "Nginx and Coolify can use different quiet windows." },
      { title: "Every quiet host", how: "The admin sees all of them. A site user sees their own." },
      { title: "Old rows stay", how: "Silence does not shorten the three years a line is kept." },
    ],
  },
  {
    slug: "brief",
    title: "A week of rows and no picture",
    pain: "Requests, probes, and sites are separate pages. There is no single picture of one host for a day or a week.",
    ideas: [
      { title: "One day", how: "A page for one host: requests, probes, and country codes for a day." },
      { title: "Seven days", how: "The same picture for seven days." },
      { title: "Slow paths", how: "The brief lists the slow paths, and each one opens its requests." },
      { title: "Top probe paths", how: "The paths that matched a probe template, counted at read time." },
      { title: "Countries", how: "Country codes from the journal, without a map of attacks." },
      { title: "A sentence", how: "A short note the owner can read without opening every table." },
      { title: "No score", how: "The brief does not turn refused requests into a score. Refuse is not on." },
      { title: "Counted when read", how: "The numbers come from the journal at read time, not from a second store." },
      { title: "Without addresses", how: "A site user gets the brief without visitor addresses." },
      { title: "The edge", how: "The admin can include the edge. A site user does not need it." },
    ],
  },
  {
    slug: "share",
    title: "You cannot hand someone a slice",
    pain: "The rows live in the cabinet. There is no file and no link you can hand to someone who should see one path.",
    ideas: [
      { title: "One path", how: "A link to one path, for people who can already open that host." },
      { title: "It expires", how: "The link stops working after a chosen time." },
      { title: "Still no address", how: "A site user who opens the link does not see visitor addresses." },
      { title: "A file of the screen", how: "Export the rows on the current page." },
      { title: "The same columns", how: "The file has the columns the cabinet already shows." },
      { title: "No body, no cookie", how: "The file cannot contain what the journal never stored." },
      { title: "Addresses for the admin", how: "Only the admin export can include addresses." },
      { title: "One row", how: "Copy one row without opening a file." },
      { title: "A read, not a copy", how: "The export reads the journal. It does not make a second store." },
      { title: "Signed out", how: "The link does not work after the session ends." },
    ],
  },
  {
    slug: "return",
    title: "The same address comes back",
    pain: "An admin can open an address and its requests. Challenge and refuse on that menu are visible and off. Nothing says the address returned today.",
    ideas: [
      { title: "Returned today", how: "The address page marks an address that already appeared today." },
      { title: "Actions stay off", how: "Challenge and refuse on that menu stay off until a host turns them on." },
      { title: "Many probe paths", how: "A note when one address asks for many probe paths." },
      { title: "Country change", how: "The admin can see the country code change for that address." },
      { title: "Hidden from the site user", how: "A site user never sees the address." },
      { title: "Hidden from this site", how: "The public site still does not draw a visitor address." },
      { title: "A watch", how: "The admin can watch one address." },
      { title: "Three years", how: "The watch lasts as long as the row, and deleting a host does not erase the row." },
      { title: "A read", how: "The watch is a reading of the journal, not a second list." },
      { title: "Not a score", how: "Returning is a fact on the row. It is not a threat count." },
    ],
  },
  {
    slug: "compare",
    title: "Several servers and no comparison",
    pain: "Each host has its own journal. Nothing puts yesterday's probe counts side by side.",
    ideas: [
      { title: "One table", how: "The admin's hosts in one table, with probe counts for the day." },
      { title: "Sort", how: "Sort by that count." },
      { title: "The last hour", how: "The same table for the last hour." },
      { title: "Own hosts only", how: "A site user sees their hosts and not anyone else's." },
      { title: "The edge", how: "The admin gets the edge as a column." },
      { title: "Quiet is visible", how: "A host with no batch is shown as quiet, not as a hidden zero." },
      { title: "Open the host", how: "A row opens that host." },
      { title: "Counted when read", how: "The numbers are computed when the page is read." },
      { title: "No second database", how: "The comparison does not keep its own copy of the journal." },
      { title: "Name them in the note", how: "The demo note can name the hosts you want to see side by side." },
    ],
  },
];

export function findPain(slug: string) {
  return PAINS.find((pain) => pain.slug === slug);
}

export function futureText() {
  return [
    FUTURE_TITLE,
    FUTURE_DESCRIPTION,
    FUTURE_LEDE,
    FUTURE_STATUS,
    FUTURE_ASK,
    ...PAINS.flatMap((pain) => [pain.title, pain.pain, ...pain.ideas.flatMap((idea) => [idea.title, idea.how])]),
  ].join(" ");
}
