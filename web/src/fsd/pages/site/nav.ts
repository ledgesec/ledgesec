export const PATH_ABOUT = "/about";
export const PATH_PRODUCT = "/product";
export const PATH_DOCS = "/docs";
export const PATH_BLOG = "/blog";
export const PATH_PRICING = "/pricing";
export const PATH_FUTURE = "/future";
export const PATH_DEMO = "/demo";

export const LABEL_ABOUT = "About";
export const LABEL_PRODUCT = "Product";
export const LABEL_DOCS = "Docs";
export const LABEL_PRICING = "Pricing";
export const LABEL_FUTURE = "Future";
export const LABEL_BLOG = "Blog";
export const LABEL_DEMO = "Get a demo";
export const LABEL_SIGN_IN = "Sign in";

export const NAV = [
  { href: PATH_FUTURE, label: LABEL_FUTURE },
  { href: PATH_PRODUCT, label: LABEL_PRODUCT },
  { href: PATH_PRICING, label: LABEL_PRICING },
  { href: PATH_ABOUT, label: LABEL_ABOUT },
  { href: PATH_DOCS, label: LABEL_DOCS },
  { href: PATH_BLOG, label: LABEL_BLOG },
] as const;
