import { ABOUT_LEDE, ABOUT_TITLE } from "../about/copy.ts";
import { BLOG_DESCRIPTION, BLOG_TITLE } from "../blog/copy.ts";
import { posts } from "../blog/posts.ts";
import { DEMO_LEDE, DEMO_TITLE } from "../demo/copy.ts";
import { DOCS_LEDE, DOCS_TITLE } from "../docs/connect.ts";
import { PAGE_LEDE, PAGE_SOURCE, PAGE_WHEN, PAGE_WHEN_ITEMS, PAGE_WHO, PAGE_WHO_ITEMS, SITE_DESCRIPTION, SITE_NAME, SITE_URL, SOURCE_HREF, SOURCE_LABEL } from "../home/overview.ts";
import { FUTURE_LEDE, FUTURE_PATH, FUTURE_STATUS, FUTURE_TITLE, PAINS } from "../future/pains.ts";
import { PREMIUM_LEDE, PREMIUM_NAME, PRICING_LEDE, SELF_LEDE, SELF_NAME, SELF_PRICE } from "../pricing/copy.ts";
import { PRODUCT_LEDE, PRODUCT_SECTIONS, PRODUCT_TITLE } from "../product/copy.ts";
import { PATH_ABOUT, PATH_BLOG, PATH_DEMO, PATH_DOCS, PATH_PRICING, PATH_PRODUCT } from "./nav.ts";
import { LLMS_FULL_PATH, LLMS_PATH } from "../../../shared/lib/crawl-paths.ts";

function href(path: string) {
  return `${SITE_URL}${path}`;
}

function item(path: string, title: string, note: string) {
  return `- [${title}](${href(path)}): ${note}`;
}

export function llmsText() {
  const future = PAINS.map((pain) => item(`${FUTURE_PATH}/${pain.slug}`, pain.title, pain.pain));
  const notes = posts.map((post) => item(`${PATH_BLOG}/${post.slug}`, post.title, post.dek));
  return [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    PAGE_LEDE,
    PRICING_LEDE,
    `${FUTURE_STATUS}. ${FUTURE_LEDE}`,
    "",
    "## Product",
    "",
    item(PATH_PRODUCT, PRODUCT_TITLE, PRODUCT_LEDE),
    item(PATH_PRICING, `${SELF_NAME} or ${PREMIUM_NAME}`, `${SELF_NAME} is ${SELF_PRICE}. ${PREMIUM_LEDE}`),
    item(PATH_DOCS, DOCS_TITLE, DOCS_LEDE),
    "",
    `## ${PAGE_WHO}`,
    "",
    ...PAGE_WHO_ITEMS.map((entry) => `- ${entry.title}. ${entry.body}`),
    "",
    `## ${PAGE_WHEN}`,
    "",
    ...PAGE_WHEN_ITEMS.map((entry) => `- ${entry.title}. ${entry.body}`),
    "",
    `## ${FUTURE_TITLE}`,
    "",
    item(FUTURE_PATH, FUTURE_TITLE, FUTURE_LEDE),
    ...future,
    "",
    "## Notes",
    "",
    item(PATH_ABOUT, ABOUT_TITLE, ABOUT_LEDE),
    item(PATH_BLOG, BLOG_TITLE, BLOG_DESCRIPTION),
    ...notes,
    item(PATH_DEMO, DEMO_TITLE, DEMO_LEDE),
    `- [${SOURCE_LABEL}](${SOURCE_HREF}): ${PAGE_SOURCE}`,
    item(LLMS_FULL_PATH, "Full text", "The same pages, written out."),
    "",
  ].join("\n");
}

export function llmsFullText() {
  const product = PRODUCT_SECTIONS.map((section) => `### ${section.title}\n\n${section.body}`);
  const future = PAINS.map((pain) => {
    const ideas = pain.ideas.map((idea) => `### ${idea.title}\n\n${idea.how}`);
    return [`## ${pain.title}`, "", pain.pain, "", ...ideas].join("\n");
  });
  const notes = posts.map((post) => [`## ${post.title}`, "", post.dek, "", ...post.body].join("\n\n"));
  return [llmsText(), "# Written out", "", `## ${PRODUCT_TITLE}`, "", PRODUCT_LEDE, "", ...product, "", `## ${SELF_NAME}`, "", SELF_LEDE, "", `## ${PREMIUM_NAME}`, "", PREMIUM_LEDE, "", ...future, "", ...notes, ""].join("\n");
}

export function humansText() {
  return [`/* ${SITE_NAME} */`, "", SITE_DESCRIPTION, PAGE_LEDE, "", `Site: ${SITE_URL}`, `Source: ${SOURCE_HREF}`, `License: ${SELF_PRICE}`, `For models: ${href(LLMS_PATH)}`, ""].join("\n");
}
