export type Post = {
  slug: string;
  title: string;
  date: string;
  dek: string;
  body: string[];
};

export const posts: Post[] = [
  {
    slug: "observe-first",
    title: "The first install only watches.",
    date: "21 Oct 2026",
    dek: "The request reaches the customer's application. Ledgesec keeps a line.",
    body: [
      "The module is for a site that stays on its own address. A visitor reaches the customer's OpenResty. The request goes on to the application. After the response, the module sends a short batch to Ledgesec.",
      "The line has a time, a site, a path, and an edge. It does not have the query string, the body, or the cookie. Challenge and deny stay in the package and stay off.",
      "Europe holds the journal. New York answers as an edge. It does not keep a second database. When a site is ready to be stopped, that is a later switch, not the first one.",
    ],
  },
  {
    slug: "probe-paths",
    title: "A request for /.env is a marker.",
    date: "21 Oct 2026",
    dek: "Scanners ask for files a site should never serve. The dashboard marks those paths.",
    body: [
      "Scanners ask for files a public site should not serve. /.env and /.htaccess are the common ones. The same pass looks for a git checkout, a WordPress login, or a dumped .sql file.",
      "On the first install Ledgesec does not block that request. The dashboard marks the path in rust, the same color on the public site and in the journal. An admin then sees the address across every edge that recorded it. A user for one site sees the marked paths for that site, without the address list.",
    ],
  },
];

export function findPost(slug: string) {
  return posts.find((post) => post.slug === slug) ?? null;
}
