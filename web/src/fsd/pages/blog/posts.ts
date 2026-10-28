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
    title: "The collector leaves the request alone.",
    date: "28 Oct 2026",
    dek: "Nginx, the Linux daemon, and Coolify all post a line after the application has answered.",
    body: [
      "A host is one web server. Every request on it can land in the journal, including a path the server does not serve. That is how a scan shows up.",
      "Nginx reports through an OpenResty module that runs after the response. The Linux daemon follows the nginx access log and does not rebuild nginx. Coolify follows the proxy log, including a name that never reached an application. None of them stand in front of the visitor.",
      "A line may include the time, method, path, status, response size, protocol, TLS, and User-Agent. The query string, the body, the cookie, and the Referer stay on the server. Country is filled from a local database when the batch arrives.",
      "Europe stores the rows. A row lasts three years, then it is dropped. Turning a host off stops new lines. It does not delete the old ones.",
    ],
  },
  {
    slug: "probe-paths",
    title: "A request for /.env is a marker.",
    date: "28 Oct 2026",
    dek: "Scanners ask for files a site should never serve. The cabinet marks those paths when it reads the journal.",
    body: [
      "Scanners ask for files a public site should not serve. /.env and /.htaccess are the common ones. The same pass looks for a git checkout, a WordPress login, or a dumped .sql file. A secret file inside a directory is marked too.",
      "The mark is applied when the cabinet reads the journal. An admin can add a pattern. The application has already answered the request.",
      "Open the path and the history lists the country and the User-Agent for each request. An admin also sees the address. A user of one site does not.",
    ],
  },
];

export function findPost(slug: string) {
  return posts.find((post) => post.slug === slug) ?? null;
}
